import { categoriesTable, postsTable } from "src/db/schema";
import { db } from "src/db";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "../utils/auth-utils";
import { generateSlug } from "../utils/slugify";

export const categoryController = {
  async createCategory(adminId: string, name: string, description?: string) {
    try {
      await verifyAdmin(adminId);

      const existingSlugs = (
        await db.select({ slug: categoriesTable.slug }).from(categoriesTable)
      ).map((c) => c.slug);

      const slug = generateSlug(name, existingSlugs);

      const [category] = await db
        .insert(categoriesTable)
        .values({ name, slug, description })
        .returning();

      return {
        statusCode: 201,
        body: {
          status: "success",
          message: "Category created successfully",
          data: category,
        },
      };
    } catch (error: any) {
      return {
        statusCode: 403,
        body: {
          status: "error",
          message: error.message || "Failed to create category",
        },
      };
    }
  },

  async getAllCategories() {
    const categories = await db.query.categoriesTable.findMany({
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });

    return {
      statusCode: 200,
      body: {
        status: "success",
        message: "Categories fetched successfully",
        data: categories,
      },
    };
  },

  async getCategoryBySlug(slug: string) {
    const category = await db.query.categoriesTable.findFirst({
      where: eq(categoriesTable.slug, slug),
      with: {
        posts: {
          where: eq(postsTable.isPublished, true),
          columns: { id: true, title: true, slug: true },
        },
      },
    });

    if (!category) {
      return {
        statusCode: 404,
        body: {
          status: "error",
          message: "Category not found",
        },
      };
    }

    return {
      statusCode: 200,
      body: {
        status: "success",
        message: "Category fetched successfully",
        data: category,
      },
    };
  },

  async validateCategory(categoryId: number) {
    const category = await db.query.categoriesTable.findFirst({
      where: eq(categoriesTable.id, categoryId),
      columns: { id: true },
    });

    return !!category;
  },

  async updateCategory(
    adminId: string,
    categoryId: number,
    updates: { name?: string; description?: string }
  ) {
    try {
      await verifyAdmin(adminId);

      const updateData: Record<string, any> = { ...updates };

      if (updates.name) {
        const currentCategory = await db.query.categoriesTable.findFirst({
          where: eq(categoriesTable.id, categoryId),
          columns: { slug: true },
        });
        const existingSlugs = (
          await db.select({ slug: categoriesTable.slug }).from(categoriesTable)
        )
          .map((c) => c.slug)
          .filter((s) => s !== currentCategory?.slug); // Exclude current slug if needed

        updateData.slug = generateSlug(updates.name, existingSlugs);
      }

      const [updatedCategory] = await db
        .update(categoriesTable)
        .set(updateData)
        .where(eq(categoriesTable.id, categoryId))
        .returning();

      return {
        statusCode: 200,
        body: {
          status: "success",
          message: "Category updated successfully",
          data: updatedCategory,
        },
      };
    } catch (error: any) {
      return {
        statusCode: 403,
        body: {
          status: "error",
          message: error.message || "Failed to update category",
        },
      };
    }
  },

  async safeDeleteCategory(adminId: string, categoryId: number) {
    try {
      await verifyAdmin(adminId);

      const exists = await this.validateCategory(categoryId); // Use your method

      if (!exists) {
        return {
          statusCode: 404,
          body: {
            status: "error",
            message: "Category not found",
          },
        };
      }

      const posts = await db.query.postsTable.findMany({
        where: eq(postsTable.categoryId, categoryId),
        limit: 1,
      });

      if (posts.length > 0) {
        return {
          statusCode: 400,
          body: {
            status: "error",
            message: "Cannot delete category - it's still being used by posts",
          },
        };
      }

      await db
        .delete(categoriesTable)
        .where(eq(categoriesTable.id, categoryId));

      return {
        statusCode: 200,
        body: {
          status: "success",
          message: "Category deleted successfully",
        },
      };
    } catch (error: any) {
      return {
        statusCode: 403,
        body: {
          status: "error",
          message: error.message || "Failed to delete category",
        },
      };
    }
  },
};
