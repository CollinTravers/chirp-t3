import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { PostView } from "~/components/postview";


const SinglePostPage: NextPage<{ id: string }> = ({ id }) => {
  const {data} = api.posts.getById.useQuery({
    id,
  });

  if (!data) return <div>404</div>

  console.log(id)

  return (
    <>
      <Head>
        <title>{`${data.post.content} - @${data.author.username}`}</title>
      </Head>
      <PageLayout>
        <PostView {...data}/>
      </PageLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = async (context) => {
  const ssg = generateSSGHelper();

  const id = context.params?.id;

  if (typeof id !== "string") throw new Error("no Id");

  //This lets us fetch ahead of time and hydrate it through server side props
  await ssg.posts.getById.prefetch({ id });

  //dehydrate
  //takes all the things we fetched, shapes it, on the app side will hydrate through react query
  //this means the data is there when the page loads, the loading state should never be hit.
  return {
    props: {
      trpcState: ssg.dehydrate(),
      id,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default SinglePostPage;
