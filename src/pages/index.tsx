import { SignInButton, useUser } from "@clerk/nextjs";
import { type NextPage } from "next";

import { RouterOutputs, api } from "~/utils/api";

//day.ks, this is for simple time
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Image from "next/image";
import { LoadingPage, LoadingSpinner} from "~/components/loading";
import { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { PageLayout } from "~/components/layout";

dayjs.extend(relativeTime);

const CreatePostWizard = () => {
  const {user} = useUser();
  const [input, setInput] = useState("");
  const ctx = api.useContext();

  const {mutate, isLoading: isPosting} = api.posts.create.useMutation({
    onSuccess: () => {
      //We want to clear the input
      //Then we want to refetch everything
      setInput("");
      void ctx.posts.getAll.invalidate();
    },
    onError: (e) => {
      const errorMessage = e.data?.zodError?.fieldErrors.content;
      if(errorMessage && errorMessage[0]) {
        toast.error(errorMessage[0]);
      } else{
        toast.error("Error trying to post, please try again later!");
      }

    }
  });

  console.log(user);

  if(!user) return null;

  return <div className="flex gap-3 w-full">
    <Image className="w-14 h-14 rounded-full" width={56} height={56} src={user.profileImageUrl} alt="Profile image"/>
    <input 
      className="bg-transparent grow outline-none" 
      placeholder="Type some emojis!"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      disabled={isPosting}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (input !== "") {
            mutate({ content: input})
          }
        }
      }}
    />
    {input !== "" && <button onClick={() => mutate({content: input})}>Post</button>}
    {isPosting && (
      <div className="flex justify-center items-center">
        <LoadingSpinner size={20}/>
      </div>
    )}
  </div>
}

//tells typescript we want an element from this array type
type PostWithUser = RouterOutputs["posts"]["getAll"][number];

const PostView = (props: PostWithUser) => {
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

const Feed = () => {
  const { data, isLoading: postsLoading} = api.posts.getAll.useQuery();

  if (postsLoading) return <LoadingPage/>;

  if (!data) return <div>Something went wrong</div>;

  return (
    <div className="flex flex-col">
      {data.map((fullPost) => (
        <PostView {...fullPost} key={fullPost.post.id}/>
      ))}
    </div>
  );
};

const Home: NextPage = () => {
  const {isLoaded: userLoaded, isSignedIn} = useUser();

  //even though we are not using the data, we do this to make sure it fetches early
  //useQuery can use the cached data, this is why we want to call it early.
  api.posts.getAll.useQuery();

  //return empty div if user isn't loaded
  if (!userLoaded) return <div></div>

  return (
      <PageLayout>
          <div className="flex border-b border-slate-400 p-4">
            {!isSignedIn && 
              <div className="flex justify-center">
                <SignInButton /> 
              </div>
            }
            {isSignedIn && 
              <CreatePostWizard />
            }
          </div>
        <Feed/>
      </PageLayout>
  );
};

export default Home;
