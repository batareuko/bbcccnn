import { PostEditor } from "@/components/PostEditor";

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ date?: string; hour?: string }> }) {
  const { date, hour } = await searchParams;
  const h = hour && /^\d{1,2}$/.test(hour) && +hour < 24 ? hour.padStart(2, "0") : "10";
  const valid = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T${h}:00` : undefined;
  return <PostEditor initialDate={valid} />;
}
