import { CreatePollForm } from "./create-poll-form";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">meet-planner</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-600">日程調整を作成します。作成すると、回答用リンクと管理用リンクが発行されます。</p>
      <CreatePollForm />
    </main>
  );
}
