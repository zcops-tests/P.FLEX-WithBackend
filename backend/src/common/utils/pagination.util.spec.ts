import { resolvePagination } from './pagination.util';

describe('resolvePagination', () => {
  it('caps pageSize at the backend maximum supported by the frontend boot flow', () => {
    expect(resolvePagination({ page: 1, pageSize: 999 })).toMatchObject({
      page: 1,
      pageSize: 500,
      skip: 0,
      take: 500,
    });
  });
});
