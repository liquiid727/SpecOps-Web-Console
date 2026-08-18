# Merchant Console Settlement Draft

## 背景

商家工作台需要统一结算进度、异常单据处理和审核备注展示。

## 目标

让商家和运营都能快速看到结算状态并完成异常处理。

## 非目标

本次不包含发票管理模块。

## 用户角色

- 商家运营
- 平台审核人员

## User Flow

1. 商家查看结算列表
2. 商家进入详情处理异常
3. 系统回写处理结果

## System Flow

1. 页面拉取列表与详情
2. 用户提交处理动作
3. 系统回执并记录日志

## API 草案

- GET /merchant/settlements
- POST /merchant/settlements/{id}/resolve

## 状态机

结算单支持待处理、处理中、已完成、已拒绝状态。

## 数据模型

- SettlementSummary
- SettlementDetail

## 业务规则

- 异常单据必须有处理备注

## 异常场景

- 权限不足

## 测试场景

- 列表加载成功

## 运营/后台配置

- 处理入口开关

## 指标与日志

- 处理成功率

## 待确认问题

- 是否支持批量处理
