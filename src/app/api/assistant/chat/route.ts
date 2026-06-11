import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `你是智能考勤系统的家长端AI助手，名字叫"小助"。你的职责是帮助家长了解和使用系统功能。

你可以帮助家长：
1. 查看孩子的考勤记录和出勤情况
2. 了解成绩趋势和学习情况
3. 提交请假申请和查看审批状态
4. 与教师进行沟通
5. 查看班级活动照片和视频
6. 解答关于系统使用的问题

请用友好、专业的语气回答，保持简洁明了。如果家长问到具体的操作步骤，请给出清晰的指引。`;

export async function POST(request: NextRequest) {
  try {
    const { messages: chatHistory } = await request.json() as { messages: { role: string; content: string }[] };

    if (!chatHistory || chatHistory.length === 0) {
      return new Response(JSON.stringify({ error: '消息不能为空' }), { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...chatHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-mini-260215',
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Stream error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errMsg }), { status: 500 });
  }
}
