import { clerkClient } from "@clerk/nextjs";
import { User } from "@clerk/nextjs/dist/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const filterUserForClient = (user: User) => {
  return {
    id: user.id, 
    username: user.username, 
    profileImageUrl: user.profileImageUrl
  };
};

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100,
    });

    //Here we are getting the users from the clerk client, and then filtering that data to only
    //return the id, username and profile image url
    const users = (
      await clerkClient.users.getUserList({
      userId: posts.map((posts) => posts.authorId),
      limit: 100,
    })
    ).map(filterUserForClient);

    console.log(users)

    //now for each post, we are grabbing the post and the authorId 
    return posts.map((post) => {

      const author = users.find((user) => user.id)

      if (!author || !author.username) 
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Author for post not found",
        });
      
      return{
        post, 
        author: {
          ...author, 
          username: author.username,
        },
      }
    })
  }),
});
