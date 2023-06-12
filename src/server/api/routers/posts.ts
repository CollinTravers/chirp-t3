import { clerkClient } from "@clerk/nextjs";

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure, privateProcedure } from "~/server/api/trpc";

import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";
import { filterUserForClient } from "~/server/helpers/filterUserForClient";
import { Post } from "@prisma/client";

const addUserDataToPosts = async (posts: Post[]) => {
  const userId = posts.map((post) => post.authorId);
  const users = (
    await clerkClient.users.getUserList({
      userId: userId,
      limit: 110,
    })
  ).map(filterUserForClient);

  return posts.map((post) => {
    const author = users.find((user) => user.id === post.authorId);

    if (!author) {
      console.error("AUTHOR NOT FOUND", post);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Author for post not found. POST ID: ${post.id}, USER ID: ${post.authorId}`,
      });
    }
    if (!author.username) {
      // user the ExternalUsername
      if (!author.externalUsername) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Author has no GitHub Account: ${author.id}`,
        });
      }
      author.username = author.externalUsername;
    }
    return {
      post,
      author: {
        ...author,
        username: author.username ?? "(username not found)",
      },
    };
  });
};

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

    return addUserDataToPosts(posts);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({ where: { id: input.id } })
      
      if (!post) throw new TRPCError({code: "NOT_FOUND"});

      return (await addUserDataToPosts([post]))[0];
    }
    ),

  getPostsByUserId: publicProcedure.input(
    z.object({
      userId: z.string(),
  })).query(({ctx, input}) => ctx.prisma.post.findMany({
    where: {
      authorId: input.userId,
    },
    take: 100,
    orderBy: [{ createdAt: "desc"}],
  }).then(addUserDataToPosts)
  ),


  //we use privateProcedure here because if public, currentUser can be null or undefined.
  //if private, it has to exist. Gaurenteeing authentication
  //zod is a validator. It validates that a piece of data matches a shape
  //we want to use this to see if the input is a valid emoji
  //below it is saying, input must be a string emoji, greater than 1 character and no larger than 280
  //if you notice the string inside of the emoji function, that is a custom error message coming from the server
  create: privateProcedure.input(
    z.object({
    content: z.string().emoji("Only emojis are allowed!").min(1).max(280),
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
