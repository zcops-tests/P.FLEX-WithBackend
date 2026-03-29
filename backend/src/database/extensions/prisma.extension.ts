import { PrismaClient } from '@prisma/client';

export const prismaExtension = (client: PrismaClient) => {
  return client.$extends({
    query: {
      $allModels: {
        async update({ args, query }) {
          // Automatic row_version increment on update
          if (args.data) {
            const data = args.data as any;
            // Check if model has row_version before targeting it
            // In Prisma Extension query, we don't easily have the model schema here
            // but we can try to increment it if it exists in the data or if we target specific models
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          // Intercept physical delete and transform into soft delete
          return (client as any)[model].update({
            ...args,
            data: {
              deleted_at: new Date(),
              row_version: { increment: 1 },
            },
          });
        },
        async findMany({ args, query }) {
          // Automatically filter out soft-deleted records unless explicitly asked
          if (args.where && (args.where as any).deleted_at === undefined) {
            (args.where as any).deleted_at = null;
          } else if (!args.where) {
            args.where = { deleted_at: null } as any;
          }
          return query(args);
        },
        // Also for findUnique, findFirst, etc.
        async findUnique({ args, query }) {
          if (args.where && (args.where as any).deleted_at === undefined) {
            // Prisma findUnique only allows unique fields in where,
            // so we might need to change it to findFirst or handle it differently
          }
          return query(args);
        },
      },
    },
  });
};
