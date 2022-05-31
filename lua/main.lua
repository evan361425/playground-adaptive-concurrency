-- This file is majorlly written by @vikas-olx and thanks a lot for his
-- detailed document at:
-- https://tech.olx.com/load-shedding-with-nginx-using-adaptive-concurrency-control-part-2-d4e4ddb853be
-- code base origin at:
-- https://github.com/vikas-olx/nginx-adaptive-concurrency-control/blob/main/chameleon.lua

local timer_lib = require("timer")
local aimd_lib = require("aimd")
local windowed_latency_lib = require("windowed_latency")

local setmetatable = setmetatable
local ngx_shared = ngx.shared
local assert = assert

-- in-flight requests
local ifr_key = 'ifr'

-- concurrency limit
local limit_key = 'limit'

local _M = {
  _VERSION = '0.01'
}

local mt = {
  __index = _M
}

function _M.new(props)
  assert(props['shared_dict_key'] ~= nil, "shared_dict_key is not specified")
  local shared_dict_key = props['shared_dict_key']
  local shared_dict = ngx_shared[shared_dict_key]
  if not shared_dict then
    return nil, "shared dict for limit not found"
  end

  local concurrency_limit = props['concurrency_limit']
  if concurrency_limit == nil then
    concurrency_limit = {
      min = 10,
      max = 30
    }
  end
  local concurrency_limit_init = concurrency_limit['initial']
  if concurrency_limit_init == nil then concurrency_limit_init = 10 end

  local latency_props = props['latency_props']
  if latency_props == nil then
    latency_props = {
      min_requests = 5
    }
  end

  local aimd_props = props['aimd_props']
  if aimd_props == nil then
    aimd_props = {
      backoff_ratio = 0.9,
      timeout_ms = 5000
    }
  end

  local windowed_latency = windowed_latency_lib.new(shared_dict, latency_props)
  local aimd = aimd_lib.new(aimd_props, concurrency_limit)

  local self = {
    shared_dict = shared_dict,
    shared_dict_key = shared_dict_key,
    concurrency_limit_init = concurrency_limit_init + 0,
    windowed_latency = windowed_latency,
    aimd = aimd,
    timer = nil
  }

  return setmetatable(self, mt)
end


function _M.incoming(self)
  local dict = self.shared_dict
  local initial = self.concurrency_limit_init
  local current_limit = dict:get(limit_key) or initial
  local ifr

  ifr, err = dict:incr(ifr_key, 1, 0)
  if not ifr then -- Fail-open if unable to record request
    return true
  end

  ngx.log(ngx.INFO, string.format("incoming: (%d/%d)", ifr, current_limit))

  if ifr > current_limit then
    ifr, err = dict:incr(ifr_key, -1)
    if not ifr then
      return true -- Fail-open if unable to record request
    end
    ifr = dict:get(ifr_key)
    ngx.log(ngx.ERR, string.format("rejected: (%d/%d)", ifr, current_limit))
    return nil, "rejected"
  end

  return true, ifr
end

function _M.leaving(self, req_latency)
  local dict = self.shared_dict

  local ifr, err = dict:incr(ifr_key, -1)
  if not ifr then
    return nil, err
  end

  self.windowed_latency:add(req_latency)
  return ifr
end

function _M.start(self)
  local handler = function ()
    local dict = self.shared_dict
    local initial = self.concurrency_limit_init
    local current_limit = dict:get(limit_key) or initial
    local ifr = dict:get(ifr_key)

    if ifr == nil then
      return nil, err
    end

    local windowed_latency, err = self.windowed_latency:get()
    if not windowed_latency then
      ngx.log(ngx.INFO, "No Adjustment:: " .. err)
      return nil, err
    end

    local num_requests = err
    local new_limit = self.aimd:adjust(current_limit, ifr, windowed_latency)
    ngx.log(ngx.ERR, string.format(
      "Adjustment:: requests: %d, limit %d --> %d, latency:%f",
      ifr,
      current_limit,
      new_limit,
      windowed_latency
    ))

    local succ, err, forcible = dict:set(limit_key, new_limit)
    if not succ then
      return nil, err
    end
  end

  local options = {
    interval = 1,      -- expiry interval in seconds
    recurring = true,  -- recurring or single timer
    immediate = false, -- initial interval will be 0
    detached = false,  -- run detached, or be garbagecollectible
    expire = handler,  -- callback on timer expiry
    shm_name = self.shared_dict_key,
    key_name = "my_timer_key"
  }

  self.timer = timer_lib(options, self)
end

return _M
