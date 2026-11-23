"use client";

// 想定していないエラーのときの画面。業務上のエラー(PollError)は各画面でメッセージにするので、ここには来ない
import { useEffect } from "react";
import { AppHeader, Button, Notice } from "./_components/ui";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <>
      <AppHeader />
      <Notice
        title="問題が発生しました"
        action={
          <Button kind="primary" size="lg" onClick={() => retry()}>
            もう一度読み込む
          </Button>
        }
      >
        <p>時間をおいてから、もう一度お試しください。</p>
      </Notice>
    </>
  );
}
