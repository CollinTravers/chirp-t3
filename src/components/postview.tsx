import { RouterOutputs } from "~/utils/api";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
//tells typescript we want an element from this array type
type PostWithUser = RouterOutputs["posts"]["getAll"][number];

export const PostView = (props: PostWithUser) => {
  const {post, author} = props;
  return(
    <div className="flex p-4 border-b border-slate-400 gap-3" key={post.id}>
      <Image className="w-14 h-14 rounded-full" width={56} height={56} src={author.profileImageUrl} alt="Profile image" />
      <div className="flex flex-col">
        <div className="flex text-slate-300 gap-1">
          <Link href={`/post/${post.id}`}><span>{`@${author.username}`}</span></Link>
          <Link href={`/@${author.username}`}><span className="font-thin">{` · ${dayjs(post.createdAt).fromNow()}`}</span></Link>
        </div>
        
        <span className="text-2xl">{post.content}</span>
      </div>  
    </div>
  );
}