-- This file is majorlly written by @vikas-olx and thanks a lot for his
-- detailed document at:
-- https://tech.olx.com/load-shedding-with-nginx-using-adaptive-concurrency-control-part-2-d4e4ddb853be
-- code base origin at:
-- https://github.com/vikas-olx/nginx-adaptive-concurrency-control/blob/main/aimd.lua
-- Also reference from:
-- https://github.com/Netflix/concurrency-limits/blob/master/concurrency-limits-core/src/main/java/com/netflix/concurrency/limits/limit/AIMDLimit.java

local AIMD = {}
AIMD.__index = AIMD

function AIMD.new(aimd_props, concurrency_limit_props)
  local self = setmetatable({}, AIMD)

  self.min = concurrency_limit_props['min']
  if self.min == nil then self.min = 10 end

  self.max = concurrency_limit_props['max']
  if self.max == nil then self.max = 30 end

  self.backoff_ratio = aimd_props['backoff_ratio']
  if self.backoff_ratio == nil then self.backoff_ratio = 0.9 end

  self.timeout_ms = aimd_props['timeout_ms']
  if self.timeout_ms == nil then self.timeout_ms = 5000 end

  return self
end

function AIMD:adjust(current_limit, ifr, latency)
  local new_limit = current_limit
  if latency >= self.timeout_ms then
    new_limit = math.ceil( current_limit * self.backoff_ratio )
  elseif ifr * 2 >= current_limit then
    -- Only update if have enough request
    new_limit = current_limit + 1
  end

  -- Cool down the limit
  if new_limit >= self.max then
    new_limit = math.ceil( current_limit * self.backoff_ratio )
  end

  return math.min(self.max, math.max(self.min, new_limit))
end

return AIMD
