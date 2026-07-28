         


手机：

自己的 App

里面：

登录
项目列表
session列表
plan模式
agent模式
模型选择
语音输入
查看 diff
审批执行

类似：

ChatGPT App
+
Codex App
+
Cursor Agent

然后：

你的电脑：

MacBook

codex cli
claude code
agent runtime

完整链路：

                 Mobile App

                    |
                    |

              Your Cloud Server

                    |
                    |

              Local Agent Runtime

                    |
                    |

             Codex CLI / Claude Code

                    |
                    |

                  Code Repo




  Remote Agent（你想做）
  
  类似：
  
  手机
  
   |
  
  你的服务器
  
   |
  
  你自己的电脑
  
   |
  
  Codex CLI



1. Mobile/Web Client

负责体验：

Chat UI

Session

Model

Mode

Voice

Approval

类似 Codex App。


2. Control Server

你的云服务：

负责：

用户
|
设备
|
项目
|
session
|
消息路由

例如：

数据库：

users

machines

projects

sessions

messages

events
3. Local Agent Runtime

安装在电脑：

类似：

agentd

负责：

连接服务器

启动 codex

读取输出

执行命令

上传事件


手机 <-> Server

非常简单：

HTTPS API
+
SSE

原因：

手机只是 App。

例如：

发送：

POST /session/message

内容：

帮我修改登录模块

接收：

SSE stream

返回：

正在分析...

读取 auth.ts

生成方案...

等待确认

这个类似 ChatGPT。

Server <-> 本地 Agent

这里才是重点。

你有两个选择：

方案 1（推荐）
gRPC Streaming

结构：

agentd

   长连接

       |

server

原因：

agentd 是程序，不是浏览器。

非常适合。



                  iOS App
                     |
                  Android
                     |
                  Web

                     |
                     |

              HTTPS + SSE

                     |

              Control Server

                     |

             gRPC Streaming

                     |

                  agentd

                     |

        +------------+------------+

        Codex CLI          Claude Code
