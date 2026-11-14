import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAuth } from "@/lib/auth";
import { PostEditor } from "@/components/PostEditor";
import type { Post } from "@/lib/client";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  const { id } = await params;
  const post = await db.post.findFirst({
    where: { id, workspaceId: auth!.workspaceId },
    include: { targets: { include: { channel: { select: { id: true, name: true, platform: true, color: true } } } } },
  });
  if (!post) notFound();
  return <PostEditor post={JSON.parse(JSON.stringify(post)) as Post} />;
}
