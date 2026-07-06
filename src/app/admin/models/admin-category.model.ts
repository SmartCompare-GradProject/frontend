export interface AdminCategoryDto {
  id: number;
  name: string;
  slug: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
}
