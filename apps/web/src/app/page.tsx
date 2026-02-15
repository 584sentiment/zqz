import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between text-center">
        <h1 className="text-4xl font-bold mb-4">智求职</h1>
        <p className="text-xl text-muted-foreground mb-8">
          AI 驱动的智能求职辅助平台
        </p>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          通过 AI 技术帮助求职者智能解析岗位要求、深度挖掘个人技能与经历、
          一键生成岗位定制简历、制定个性化面试准备方案
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/register">开始使用</Link>
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link href="/login">登录</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
