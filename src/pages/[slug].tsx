import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import Image from "next/image";
import { PageLayout } from "~/components/layout";
import { LoadingPage } from "~/components/loading";
import { PostView } from "~/components/postview";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";

const ProfileFeed = (props: {userId: string}) => {
  const {data, isLoading} = api.posts.getPostsByUserId.useQuery({userId: props.userId})

  if (isLoading) return <LoadingPage/>;

  if (!data || data.length === 0) return <div> User has not posted</div>;

  return <div className="flex flex-col">
    {data.map((fullPost) => (
      <PostView {...fullPost} key={fullPost.post.id}/>
    ))}
  </div>
}

const ProfilePage: NextPage<{ username: string }> = ({ username }) => {
  const {data} = api.profile.getUserByUsername.useQuery({
    username,
  });

  if (!data) return <div>404</div>

  console.log(username)

  return (
    <>
      <Head>
        <title>{data.username ?? data.externalUsername}</title>
      </Head>
      <PageLayout>
        <div className="h-36 border-slate-400 bg-slate-600 relative">
          <Image 
            src={data.profileImageUrl} 
            alt={`${data.username ?? data.externalUsername ?? "unknown"}'s profile picture`} 
            width={128} 
            height={128}
            className="-mb-[64px] absolute bottom-0 left-0 ml-4 rounded-full border-4 border-black bg-black"
          />
        </div>
        <div className="h-[64px]"></div>
        <div className="p-4 text-2xl font-bold">
          {`@${data.username ?? data.externalUsername ??"unknown"}`}
        </div>
        <div className="border-b w-full"></div>
        <ProfileFeed userId={data.id}/>
      </PageLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = async (context) => {
  const ssg = generateSSGHelper();

  const slug = context.params?.slug;

  if (typeof slug !== "string") throw new Error("no slug");

  //remove the @ from the slug
  const username = slug.replace("@", "");

  //This lets us fetch ahead of time and hydrate it through server side props
  await ssg.profile.getUserByUsername.prefetch({ username });

  //dehydrate
  //takes all the things we fetched, shapes it, on the app side will hydrate through react query
  //this means the data is there when the page loads, the loading state should never be hit.
  return {
    props: {
      trpcState: ssg.dehydrate(),
      username,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default ProfilePage;
