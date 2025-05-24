export const generateSlug = (title: string, existingSlugs: string[] = []) => {
  let slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  //handle duplicates
  let uniqueSlug = slug;
  let counter = 1;

  while (existingSlugs.includes(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter++}`;
  }

  return uniqueSlug;
};
