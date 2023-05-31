import { clerkClient } from "@clerk/nextjs";
import { User } from "@clerk/nextjs/dist/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure, privateProcedure } from "~/server/api/trpc";

const filterUserForClient = (user: User) => {
  return {
    id: user.id, 
    username: user.username, 
    profileImageUrl: user.profileImageUrl
  };
};

import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";
import { lutimes } from "fs";

// Create a new ratelimiter, that allows 3 requests per 1 minute
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  analytics: true,
  /**
   * Optional prefix for the keys used in redis. This is useful if you want to share a redis
   * instance with other applications and want to avoid key collisions. The default prefix is
   * "@upstash/ratelimit"
   */ 
  prefix: "@upstash/ratelimit",
});

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100,
      orderBy: [
        {createdAt: "desc"}
      ],
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

  //we use privateProcedure here because if public, currentUser can be null or undefined.
  //if private, it has to exist. Gaurenteeing authentication
  //zod is a validator. It validates that a piece of data matches a shape
  //we want to use this to see if the input is a valid emoji
  //below it is saying, input must be a string emoji, greater than 1 character and no larger than 280
  create: privateProcedure.input(
    z.object({
    content: z.string().emoji().min(1).max(280),
  })
  )
  .mutation(async ({ctx, input}) => {
    const authorId = ctx.userId;

    const {success} = await ratelimit.limit(authorId);

    if (!success) throw new TRPCError({code: "TOO_MANY_REQUESTS"});

    const post = await ctx.prisma.post.create({
      data: {
        authorId,
        content: input.content,
      }
    });

    return post;
  }),

});
