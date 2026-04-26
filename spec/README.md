# Spec

Normalized, machine-consumable spec bundles live here.

spec这里会分为两类，一类md方便面向人查看

一类是yaml 方便机器查看

我们有专门spec agent

专门负责

1. 格式处理（必须带上版本+更新日期）
2. 内容生成：根据得到的spec-draft，将draft的内容融入spec当中
   可能是新建一个spec文件，可能是对原有的spec进行修改
3. 生成和维护两类spec，md文件和yaml文件，对于其他的agent只是读取yaml文件，md是留作方便人去阅读和维护使用
