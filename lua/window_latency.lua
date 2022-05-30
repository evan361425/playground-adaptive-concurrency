-- This file is majorlly written by @vikas-olx and thanks a lot for his
-- detailed document at:
-- https://tech.olx.com/load-shedding-with-nginx-using-adaptive-concurrency-control-part-2-d4e4ddb853be
-- code base origin at:
-- https://github.com/vikas-olx/nginx-adaptive-concurrency-control/blob/main/windowed_latency.lua

local WindowedLatency = {}
WindowedLatency.__index = WindowedLatency

-- number of requests in adjustment window
local num_requests_key = 'num'

-- sum of latencies of all requests in adjustment window
local latency_sum_key = 'sum'

-- key to track the latencies of all requests in adjustment window
-- Used for calculating percentiles
local latencies_key = 'latencies'

function WindowedLatency.new(dict, props)
  local self = setmetatable({}, WindowedLatency)
  self.dict = dict

  self.min_requests = props['min_requests']
  if self.min_requests == nil then self.min_requests = 5 end

  local percentile_props = props['percentile']
  self.isAverage = percentile_props == nil

  if percentile_props ~= nil then
    self.percentile_val = percentile_props['usage']
    if self.percentile_val == nil then self.percentile_val = 90 end
  end

  return self
end

function WindowedLatency:add(req_latency)
  if self.isAverage then
    self.dict:incr(num_requests_key, 1, 0)
    self.dict:incr(latency_sum_key, req_latency, 0)
  else
    self.dict:rpush(latencies_key, req_latency)
  end
end

function WindowedLatency:get()
  if self.isAverage then
    return self.getAvg()
  else
    return self.getPercentile()
  end
end

function WindowedLatency::getAvg()
  local sum_of_latencies, err = self.dict:get(latency_sum_key)
  if not sum_of_latencies then
    return nil, 'Unable to retrieve sum of latencies in window: ' .. (err or "")
  end

  local num_requests, err = self.dict:get(num_requests_key)
  if not num_requests then
    return nil, 'Unable to retrieve number of requests in window: ' .. (err or "")
  end

  if num_requests < self.min_requests then
    return nil, string.format('No. of requests in window (%d) less than min required (%d)', num_requests, self.min_requests)
  end

  local avg_latency = sum_of_latencies/num_requests

  self.dict:set(latency_sum_key, 0)
  self.dict:set(num_requests_key, 0)

  return avg_latency, num_requests
end

function WindowedLatency::getPercentile()
  local len, err = self.dict:llen(latencies_key)
  if len < self.min_requests then
    return nil, string.format('No. of requests in window (%d) less than min required (%d)', len, self.min_requests)
  end

  latencies = {}
  for i = 1, len do
    table.insert(latencies, i, self.dict:lpop(latencies_key))
  end

  table.sort(latencies)
  local idx = math.floor( len * self.percentile_val /100 )
  local percentile_latency = latencies[idx]

  return percentile_latency, len
end

return WindowedLatency
