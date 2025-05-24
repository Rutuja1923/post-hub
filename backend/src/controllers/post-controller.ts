import { db } from "../db";
import { postsTable, categoriesTable, usersTable } from "../db/schema";
import { eq, and, or, isNull, ne, desc } from "drizzle-orm";
import { AuthenticatedUser } from "../types/auth";
import { generateSlug } from "src/utils/slugify";
import { verifyAdmin } from "src/utils/auth-utils";

interface CreatePostData {
  title: string;
  content: string;
  excerpt?: string;
  isPublished?: boolean;
  categoryId?: number;
}

interface GetPostsOptions {
  categoryId?: number;
  userId?: string;
  username?: string;
  publishedOnly?: boolean;
  limit?: number;
  offset?: number;
  includeUnpublishedForOwner?: string;
}

export const postController = {
  async createPost(user: AuthenticatedUser, data: CreatePostData) {
    //verify user exists and is active
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
          message: "User not found or account inactive",
        },
      };
    }

    //validate category if provided
    if (data.categoryId) {
      const category = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, data.categoryId))
        .execute();

      if (category.length === 0) {
        return {
          statusCode: 404,
          body: {
            status: "error",
            message: "Category not found",
          },
        };
      }
    }

    //generate slug from title
    const existingSlugs = (
      await db.select({ slug: postsTable.slug }).from(postsTable)
    ).map((row) => row.slug);

    const slug = generateSlug(data.title, existingSlugs);

    const [newPost] = await db
      .insert(postsTable)
      .values({
        userId: user.id,
        title: data.title,
        slug,
        content: data.content,
        excerpt: data.excerpt,
        isPublished: data.isPublished ?? true,
        categoryId: data.categoryId,
        publishedAt: data.isPublished ? new Date() : null,
      })
      .returning();

    return {
      statusCode: 201,
      body: {
        status: "success",
        message: "Post created successfully",
        data: newPost,
      },
    };
  },

  async getPosts(options: GetPostsOptions) {
    try {
      const whereConditions: any[] = [
        eq(usersTable.status, "active"),
        isNull(usersTable.deletedAt),
        eq(postsTable.userId, usersTable.id),
      ];

      if (options.categoryId !== undefined) {
        whereConditions.push(eq(postsTable.categoryId, options.categoryId));
      }

      if (options.userId !== undefined) {
        whereConditions.push(eq(postsTable.userId, options.userId));
      }

      if (options.publishedOnly) {
        if (options.includeUnpublishedForOwner) {
          whereConditions.push(
            or(
              eq(postsTable.isPublished, true),
              and(
                eq(postsTable.isPublished, false),
                eq(postsTable.userId, options.includeUnpublishedForOwner)
              )
            )
          );
        } else {
          whereConditions.push(eq(postsTable.isPublished, true));
        }
      }

      const query = db
        .select({
          post: postsTable,
          user: {
            id: usersTable.id,
            username: usersTable.username,
            email: usersTable.email,
            status: usersTable.status,
          },
        })
        .from(postsTable)
        .innerJoin(usersTable, eq(postsTable.userId, usersTable.id))
        .where(and(...whereConditions))
        .orderBy(postsTable.publishedAt);

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
          message: "Posts fetched successfully",
          data: result,
        },
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        body: {
          status: "error",
          message: "Failed to fetch posts",
          data: {
            error: err.message,
          },
        },
      };
    }
  },

  async getPostByIdOrSlug(identifier: string, requestingUserId?: string) {
    try {
      const isUuid = identifier.length === 36;

      const query = db
        .select({
          post: postsTable,
          user: {
            id: usersTable.id,
            status: usersTable.status,
            deletedAt: usersTable.deletedAt,
            role: usersTable.role,
          },
        })
        .from(postsTable)
        .innerJoin(
          usersTable,
          and(
            eq(postsTable.userId, usersTable.id),
            eq(usersTable.status, "active"),
            isNull(usersTable.deletedAt)
          )
        )
        .where(
          isUuid
            ? eq(postsTable.id, identifier)
            : eq(postsTable.slug, identifier)
        );

      const result = await query.execute();
      const record = result[0];

      if (!record) {
        return {
          statusCode: 404,
          body: {
            status: "error",
            message: "Post not found",
          },
        };
      }

      const { post, user } = record;

      const isOwner = requestingUserId === post.userId;
      const isAdminUser = requestingUserId
        ? await verifyAdmin(requestingUserId)
        : false;

      if (!post.isPublished && !isOwner && !isAdminUser) {
        return {
          statusCode: 403,
          body: {
            status: "error",
            message: "Unauthorized to view this post",
          },
        };
      }

      return {
        statusCode: 200,
        body: {
          status: "success",
          message: "Post fetched successfully",
          data: post,
        },
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        body: {
          status: "error",
          message: "Failed to fetch post",
          data: {
            error: err.message,
          },
        },
      };
    }
  },

  async updatePost(
    postId: string,
    userId: string,
    updates: {
      title?: string;
      content?: string;
      excerpt?: string;
      isPublished?: boolean;
      categoryId?: number;
    }
  ) {
    try {
      const post = await db.query.postsTable.findFirst({
        where: eq(postsTable.id, postId),
        with: {
          user: {
            columns: { status: true, deletedAt: true },
          },
        },
      });

      if (!post || post.user.status !== "active" || post.user.deletedAt) {
        return {
          statusCode: 403,
          body: {
            status: "error",
            message: "Post not found or user account inactive",
          },
        };
      }

      if (post.userId !== userId) {
        return {
          statusCode: 403,
          body: {
            status: "error",
            message: "Unauthorized to update this post",
          },
        };
      }

      const updateData: any = { ...updates, updatedAt: new Date() };

      if (updates.title) {
        const existingSlugs = (
          await db
            .select({ slug: postsTable.slug })
            .from(postsTable)
            .where(ne(postsTable.id, postId))
        ).map((row) => row.slug);

        updateData.slug = generateSlug(updates.title, existingSlugs);
      }

      if (typeof updates.isPublished !== "undefined") {
        updateData.publishedAt = updates.isPublished
          ? post.publishedAt || new Date()
          : null;
      }

      const [updatedPost] = await db
        .update(postsTable)
        .set(updateData)
        .where(eq(postsTable.id, postId))
        .returning();

      return {
        statusCode: 200,
        body: {
          status: "success",
          message: "Post updated successfully",
          data: updatedPost,
        },
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        body: {
          status: "error",
          message: "Failed to update post",
          data: {
            error: err.message,
          },
        },
      };
    }
  },

  async deletePost(postId: string, userId: string) {
    try {
      const post = await db.query.postsTable.findFirst({
        where: eq(postsTable.id, postId),
        with: {
          user: {
            columns: { status: true, deletedAt: true },
          },
        },
      });

      if (!post || post.user.status !== "active" || post.user.deletedAt) {
        return {
          statusCode: 403,
          body: {
            status: "error",
            message: "Post not found or user account inactive",
          },
        };
      }

      if (post.userId !== userId) {
        return {
          statusCode: 403,
          body: {
            status: "error",
            message: "Unauthorized to delete this post",
          },
        };
      }

      await db.delete(postsTable).where(eq(postsTable.id, postId)).execute();

      return {
        statusCode: 200,
        body: {
          status: "success",
          message: "Post deleted successfully",
        },
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        body: {
          status: "error",
          message: "Failed to delete post",
          data: {
            error: err.message,
          },
        },
      };
    }
  },

  async getPostsByUser(options: GetPostsOptions) {
    try {
      const whereConditions: any[] = [
        eq(usersTable.status, "active"),
        isNull(usersTable.deletedAt),
        eq(postsTable.userId, usersTable.id),
      ];

      //filter by userId or username
      if (options.userId) {
        whereConditions.push(eq(postsTable.userId, options.userId));
      } else if (options.username) {
        whereConditions.push(eq(usersTable.username, options.username));
      } else {
        return {
          statusCode: 400,
          body: {
            status: "error",
            message: "Either userId or username must be provided",
          },
        };
      }

      //handle published/unpublished posts visibility
      if (options.publishedOnly) {
        if (options.includeUnpublishedForOwner) {
          whereConditions.push(
            or(
              eq(postsTable.isPublished, true),
              and(
                eq(postsTable.isPublished, false),
                eq(postsTable.userId, options.includeUnpublishedForOwner)
              )
            )
          );
        } else {
          whereConditions.push(eq(postsTable.isPublished, true));
        }
      }

      const query = db
        .select({
          post: postsTable,
          user: {
            id: usersTable.id,
            username: usersTable.username,
            email: usersTable.email,
            status: usersTable.status,
          },
        })
        .from(postsTable)
        .innerJoin(usersTable, eq(postsTable.userId, usersTable.id))
        .where(and(...whereConditions))
        .orderBy(desc(postsTable.publishedAt));

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
          message: "User posts fetched successfully",
          data: result,
        },
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        body: {
          status: "error",
          message: "Failed to fetch posts",
          data: { error: err.message },
        },
      };
    }
  },
};
