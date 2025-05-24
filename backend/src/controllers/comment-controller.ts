import { db } from "../db";
import { commentsTable, postsTable, usersTable } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";

export const commentController = {
  //add a comment to a post
  async addComment(userId: string, postId: string, content: string) {
    //verify user is active
    const user = await db.query.usersTable.findFirst({
      where: and(
        eq(usersTable.id, userId),
        eq(usersTable.status, "active"),
        isNull(usersTable.deletedAt)
      ),
      columns: { id: true },
    });

    if (!user) {
      return {
        statusCode: 403,
        body: {
          status: "error",
          message: "User account inactive",
        },
      };
    }

    //verify post exists and is from an active user
    const post = await db.query.postsTable.findFirst({
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

    if (!post || post.user.status !== "active" || post.user.deletedAt) {
      return {
        statusCode: 404,
        body: {
          status: "error",
          message: "Post not available for commenting",
        },
      };
    }

    const [newComment] = await db
      .insert(commentsTable)
      .values({
        userId,
        postId,
        content,
      })
      .returning();

    return {
      statusCode: 201,
      body: {
        status: "success",
        message: "Comment added successfully",
        data: newComment,
      },
    };
  },

  //get comments for a post with optional pagination
  async getCommentsByPostId(
    postId: string,
    options: {
      limit?: number;
      offset?: number;
      includeUserDetails?: boolean;
    } = {}
  ) {
    //base query to verify post exists and is from active user
    const postWithUser = await db
      .select()
      .from(postsTable)
      .innerJoin(
        usersTable,
        and(
          eq(postsTable.userId, usersTable.id),
          eq(usersTable.status, "active"),
          isNull(usersTable.deletedAt)
        )
      )
      .where(and(eq(postsTable.id, postId), eq(postsTable.isPublished, true)))
      .limit(1)
      .execute();

    if (postWithUser.length === 0) {
      return {
        statusCode: 404,
        body: {
          status: "error",
          message: "Post not found or not available",
        },
      };
    }

    //start building the query
    const query = db
      .select({
        comment: commentsTable,
        ...(options.includeUserDetails && {
          user: {
            id: usersTable.id,
            username: usersTable.username,
          },
        }),
      })
      .from(commentsTable)
      .innerJoin(
        usersTable,
        and(
          eq(commentsTable.userId, usersTable.id),
          eq(usersTable.status, "active"),
          isNull(usersTable.deletedAt)
        )
      )
      .where(eq(commentsTable.postId, postId))
      .orderBy(commentsTable.createdAt);

    //apply pagination if specified
    if (options.limit !== undefined) {
      query.limit(options.limit);
    }
    if (options.offset !== undefined) {
      query.offset(options.offset);
    }

    const result = await query.execute();
    const formatted = options.includeUserDetails
      ? result.map((row) => ({
          ...row.comment,
          user: row.user,
        }))
      : result.map((row) => row.comment);
    return {
      statusCode: 200,
      body: {
        status: "success",
        message: "Comments fetched successfully",
        data: formatted,
      },
    };
  },

  //update a comment
  async updateComment(
    commentId: number,
    userId: string,
    content: string,
    isAdmin: boolean = false
  ) {
    const comment = await db.query.commentsTable.findFirst({
      where: eq(commentsTable.id, commentId),
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

    if (!comment) {
      return {
        statusCode: 404,
        body: {
          status: "error",
          message: "Comment not found",
        },
      };
    }

    //check if comment user is active
    if (comment.user.status !== "active" || comment.user.deletedAt) {
      return {
        statusCode: 403,
        body: {
          status: "error",
          message: "Comment owner account is inactive",
        },
      };
    }

    //check if post and post owner are active
    if (
      !comment.post ||
      !comment.post.isPublished ||
      comment.post.user.status !== "active" ||
      comment.post.user.deletedAt
    ) {
      return {
        statusCode: 403,
        body: {
          status: "error",
          message: "Post not available",
        },
      };
    }

    //check if user is owner or admin
    if (!isAdmin && comment.userId !== userId) {
      return {
        statusCode: 401,
        body: {
          status: "error",
          message: "Unauthorized to update this comment",
        },
      };
    }

    const [updatedComment] = await db
      .update(commentsTable)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(commentsTable.id, commentId))
      .returning();

    return {
      statusCode: 200,
      body: {
        status: "success",
        message: "Comment updated successfully",
        data: updatedComment,
      },
    };
  },

  //delete a comment (only by owner or admin)
  async deleteComment(
    commentId: number,
    userId: string,
    isAdmin: boolean = false
  ) {
    const comment = await db.query.commentsTable.findFirst({
      where: eq(commentsTable.id, commentId),
      with: {
        user: {
          columns: {
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!comment) {
      return {
        statusCode: 404,
        body: {
          status: "error",
          message: "Comment not found",
        },
      };
    }

    //check if comment user is active
    if (comment.user.status !== "active" || comment.user.deletedAt) {
      return {
        statusCode: 403,
        body: {
          status: "error",
          message: "Comment owner account is inactive",
        },
      };
    }

    //check if user is owner or admin
    if (!isAdmin && comment.userId !== userId) {
      return {
        statusCode: 401,
        body: {
          status: "error",
          message: "Unauthorized to delete this comment",
        },
      };
    }

    await db
      .delete(commentsTable)
      .where(eq(commentsTable.id, commentId))
      .execute();

    return {
      statusCode: 200,
      body: {
        status: "success",
        message: "Comment deleted successfully",
      },
    };
  },

  //get comments by user ID
  async getCommentsByUserId(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    //verify user exists and is active
    const user = await db.query.usersTable.findFirst({
      where: and(
        eq(usersTable.id, userId),
        eq(usersTable.status, "active"),
        isNull(usersTable.deletedAt)
      ),
      columns: { id: true },
    });

    if (!user) {
      return {
        statusCode: 404,
        body: {
          status: "error",
          message: "User not found or inactive",
        },
      };
    }

    //start building the query
    const query = db
      .select({
        comment: commentsTable,
        post: {
          id: postsTable.id,
          title: postsTable.title,
          slug: postsTable.slug,
        },
      })
      .from(commentsTable)
      .innerJoin(
        postsTable,
        and(
          eq(commentsTable.postId, postsTable.id),
          eq(postsTable.isPublished, true)
        )
      )
      .where(eq(commentsTable.userId, userId))
      .orderBy(commentsTable.createdAt);

    //apply pagination if specified
    if (options.limit !== undefined) {
      query.limit(options.limit);
    }
    if (options.offset !== undefined) {
      query.offset(options.offset);
    }

    const result = await query.execute();
    return {
      statusCode: 200,
      body: {
        status: "success",
        message: "Comments by user fetched successfully",
        data: result.map((row) => ({ ...row.comment, post: row.post })),
      },
    };
  },
};
