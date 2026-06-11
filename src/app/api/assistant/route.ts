import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

const SYSTEM_PROMPT = `你是"智小班"——智能电子班牌的AI助手。你的职责是帮助学生和教师快速上手使用电子班牌系统。

## 系统功能介绍

### 学生端功能：
1. **人脸识别打卡** - 摄像头对准人脸，自动识别并完成考勤打卡
2. **课程表查看** - 查看本周课程安排
4. **考勤记录** - 查看历史考勤记录
5. **班级公告** - 查看班级发布的重要通知
6. **个人信息** - 修改姓名、学号、班级信息

### 教师端功能：
1. **班级管理** - 创建、编辑、删除班级，设置班级信息
2. **学生管理** - 添加学生、编辑学生信息、查看学生考勤状态
3. **课程表管理** - 设置班级每周课程安排
4. **公告发布** - 发布班级公告，可标记为重要
5. **考勤记录** - 查看班级考勤统计和详细记录

## 回答原则
1. **简洁友好** - 用简洁易懂的语言回答问题
2. **操作指引** - 给出具体的操作步骤指引
3. **主动帮助** - 主动询问用户是否需要帮助
4. **限定范围** - 只回答与电子班牌系统相关的问题，其他问题礼貌引导回到系统使用

## 回答风格
- 使用友好的口吻，像朋友一样帮助用户
- 对于操作类问题，尽量给出步骤编号
- 如遇复杂问题，主动询问用户想了解哪方面的内容
- 可以适当使用 emoji 表情，让对话更生动`;

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建完整消息列表
    const fullMessages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ];

    // 使用流式输出
    const stream = client.stream(fullMessages, {
      temperature: 0.7,
    });

    // 创建流式响应
    const encoder = new TextEncoder();
    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const content = typeof chunk.content === 'string' 
                ? chunk.content 
                : JSON.stringify(chunk.content);
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(streamResponse, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Assistant API error:", error);
    return NextResponse.json(
      { error: "服务暂时不可用，请稍后重试" },
      { status: 500 }
    );
  }
}
