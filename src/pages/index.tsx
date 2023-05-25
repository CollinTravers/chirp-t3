import { SignIn, SignInButton, SignOutButton, SignUpButton, useUser } from "@clerk/nextjs";
import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";

import { RouterOutputs, api } from "~/utils/api";

const CreatePostWizard = () => {
  const {user} = useUser();

  console.log(user);

  if(!user) return null;

  return <div className="flex gap-3 w-full">
    <img className="w-14 h-14 rounded-full" src={user.profileImageUrl} alt="Profile image"/>
    <input className="bg-transparent grow outline-none" placeholder="Type some emojis!"></input>
  </div>
}


//tells typescript we want an element from this array type
type PostWithUser = RouterOutputs["posts"]["getAll"][number];


const PostView = (props: PostWithUser) => {
  const {post, author} = props;
  return(
    <div className="flex p-4 border-b border-slate-400 gap-3" key={post.id}>
      <img className="w-14 h-14 rounded-full" src={author.profileImageUrl} alt="Profile image" />
      <div className="flex flex-col">
        <div className="flex text-slate-300">
          {`@${author.username}`}
        </div>
        <span>
          {post.content}
        </span>
      </div>  
    </div>
  );
}

const Home: NextPage = () => {
  const user = useUser();

  const {data, isLoading} = api.posts.getAll.useQuery();

  //You can grab states from react useQuery
  if (isLoading) return <div>Loading...</div>

  //if no data, return this
  if (!data) return <div>Something went wrong...</div>

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex justify-center">
        <div className=" w-full md:max-w-2xl border-x h-screen border-slate-400">
          <div className="border-b border-slate-400 p-4">
            {!user.isSignedIn && <div className="flex justify-center"><SignInButton /> </div>}
            {user.isSignedIn && <CreatePostWizard />}
          </div>
          <div className="flex flex-col">
            {data?.map((fullPost) => (<PostView {...fullPost} key={fullPost.post.id}/>))}
          </div>
        </div>
        
      </main>
    </>
  );
};

export default Home;
