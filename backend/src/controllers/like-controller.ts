import { db } from "../db";
import { likesTable, postsTable, usersTable } from "../db/schema";
import { and, eq, sql, isNull } from "drizzle-orm";
import { AuthenticatedUser } from "../types/auth";

export interface LikePostData {
  postId: string;
}

export interface GetLikesOptions {
  includeUserDetails?: boolean;
  includePostDetails?: boolean;
  limit?: number;
  offset?: number;
}

export const likeController = {
  async likePost(user: AuthenticatedUser, data: LikePostData) {
    const userExists = await db.query.usersTable.findFirst({
      where: and(
        eq(usersTable.id, user.id),
        eq(usersTable.status, "active"),
        isNull(usersTable.deletedAt)
      ),
      columns: { id: true },
    });

    if (!userExists) {
      return {
        statusCode: 403,
        body: {
          status: "error",
          message: "User account inactive",
        },
      };
    }

    const post = await db.query.postsTable.findFirst({
      where: and(
        eq(postsTable.id, data.postId),
        eq(postsTable.isPublished, true)
      ),
      with: {
        user: {
          columns: {
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!post || post.user.status !== "active" || post.user.deletedAt) {
      return {
        statusCode: 404,
        body: {
          status: "error",
          message: "Post not available for liking",
        },
      };
    }

    const existingLike = await db.query.likesTable.findFirst({
      where: and(
        eq(likesTable.userId, user.id),
        eq(likesTable.postId, data.postId)
      ),
    });

    if (existingLike) {
      return {
        statusCode: 400,
        body: {
          status: "error",
          message: "Post already liked by user",
        },
      };
    }

    const [newLike] = await db
      .insert(likesTable)
      .values({ userId: user.id, postId: data.postId })
      .returning();

    return {
      statusCode: 200,
      body: {
        status: "success",
        data: newLike,
      },
    };
  },

  async unlikePost(user: AuthenticatedUser, data: LikePostData) {
    const userExists = await db.query.usersTable.findFirst({
      where: and(
        eq(usersTable.id, user.id),
        eq(usersTable.status, "active"),
        isNull(usersTable.deletedAt)
      ),
      columns: { id: true },
    });

    if (!userExists) {
      return {
        statusCode: 403,
        body: {
          status: "error",
          message: "User account inactive",
        },
      };
    }

    const deleteQuery = db
      .delete(likesTable)
      .where(
        and(eq(likesTable.userId, user.id), eq(likesTable.postId, data.postId))
      );
    await deleteQuery.execute();

    return {
      statusCode: 200,
      body: {
        status: "success",
        message: "Post unliked successfully",
      },
    };
  },

  async getLikesByPostId(postId: string, options: GetLikesOptions = {}) {
    const postExists = await db.query.postsTable.findFirst({
      where: and(eq(postsTable.id, postId), eq(postsTable.isPublished, true)),
      with: {
        user: {
          columns: { id: true, status: true, deletedAt: true },
        },
      },
    });

    if (
      !postExists ||
      postExists.user.status !== "active" ||
      postExists.user.deletedAt
    ) {
      return {
        statusCode: 404,
        body: {
          status: "error",
          message: "Post not found or not available",
        },
      };
    }

    const query = db
      .select({
        like: likesTable,
        ...(options.includeUserDetails && {
          user: {
            id: usersTable.id,
            username: usersTable.username,
          },
        }),
      })
      .from(likesTable)
      .innerJoin(
        usersTable,
        and(
          eq(likesTable.userId, usersTable.id),
          eq(usersTable.status, "active"),
          isNull(usersTable.deletedAt)
        )
      )
      .where(eq(likesTable.postId, postId))
      .orderBy(likesTable.createdAt);

    const result = await query.execute();

    return {
      statusCode: 200,
      body: {
        status: "success",
        data: options.includeUserDetails
          ? result.map((row) => ({ ...row.like, user: row.user }))
          : result.map((row) => row.like),
      },
    };
  },

  async hasUserLikedPost(user: AuthenticatedUser, postId: string) {
    const like = await db.query.likesTable.findFirst({
      where: and(eq(likesTable.userId, user.id), eq(likesTable.postId, postId)),
      with: {
        user: {
          columns: {
            status: true,
            deletedAt: true,
          },
        },
        post: {
          columns: {
            isPublished: true,
          },
          with: {
            user: {
              columns: {
                status: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });

    const liked =
      !!like &&
      like.user.status === "active" &&
      !like.user.deletedAt &&
      like.post.isPublished &&
      like.post.user.status === "active" &&
      !like.post.user.deletedAt;

    return {
      statusCode: 200,
      body: {
        status: "success",
        data: liked,
      },
    };
  },

  async getLikesByUser(user: AuthenticatedUser, options: GetLikesOptions = {}) {
    const userExists = await db.query.usersTable.findFirst({
      where: and(
        eq(usersTable.id, user.id),
        eq(usersTable.status, "active"),
        isNull(usersTable.deletedAt)
      ),
      columns: { id: true },
    });

    if (!userExists) {
      return {
        statusCode: 403,
        body: {
          status: "error",
          message: "User not found or inactive",
        },
      };
    }

    const query = db
      .select({
        like: likesTable,
        ...(options.includePostDetails && {
          post: {
            id: postsTable.id,
            title: postsTable.title,
            slug: postsTable.slug,
            isPublished: postsTable.isPublished,
          },
        }),
      })
      .from(likesTable)
      .innerJoin(
        postsTable,
        and(
          eq(likesTable.postId, postsTable.id),
          eq(postsTable.isPublished, true)
        )
      )
      .where(eq(likesTable.userId, user.id))
      .orderBy(likesTable.createdAt);

    if (options.limit !== undefined) query.limit(options.limit);
    if (options.offset !== undefined) query.offset(options.offset);

    const result = await query.execute();
    const validLikes = result.filter((row) =>
      options.includePostDetails ? row.post : true
    );

    return {
      statusCode: 200,
      body: {
        status: "success",
        data: options.includePostDetails
          ? validLikes.map((row) => ({ ...row.like, post: row.post }))
          : validLikes.map((row) => row.like),
      },
    };
  },

  async getLikeCount(postId: string) {
    const postExists = await db.query.postsTable.findFirst({
      where: and(eq(postsTable.id, postId), eq(postsTable.isPublished, true)),
      with: {
        user: {
          columns: {
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!postExists) {
      return {
        statusCode: 404,
        body: {
          status: "error",
          message: "Post not found or not available",
        },
      };
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(likesTable)
      .where(eq(likesTable.postId, postId))
      .execute();

    return {
      statusCode: 200,
      body: {
        status: "success",
        data: result[0]?.count || 0,
      },
    };
  },
};
