import { PrismaClient } from '@prisma/client';

export const rowVersionExtension = (prisma: PrismaClient) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async update({ model, args, query }) {
          // Increment row_version on every update
          if (args.data) {
            args.data = {
              ...args.data,
              row_version: { increment: 1 },
            };
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (args.data) {
            args.data = {
              ...args.data,
              row_version: { increment: 1 },
            };
          }
          return query(args);
        },
        async upsert({ model, args, query }) {
          if (args.update) {
            args.update = {
              ...args.update,
              row_version: { increment: 1 },
            };
          }
          return query(args);
        },
      },
    },
  });
};
