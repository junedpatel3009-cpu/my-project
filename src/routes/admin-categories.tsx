import { createServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, useLoaderData, useRouter } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/current-user.server";
import {
  createServiceCategory,
  deleteServiceCategory,
  getServiceCategories,
  type ServiceCategoryInput,
  type ServiceCategoryRecord,
  updateServiceCategory,
} from "@/lib/services-db.server";

const loadAdminCategoriesData = createServerFn({ method: "GET" }).handler(async () => {
  const viewer = getCurrentUser();
  if (!viewer || viewer.role !== "ADMIN") {
    return { viewer: null, categories: [] as ServiceCategoryRecord[] };
  }

  return {
    viewer,
    categories: getServiceCategories(),
  };
});

const saveServiceCategory = createServerFn({ method: "POST" })
  .inputValidator((input: { id?: number } & ServiceCategoryInput) => input)
  .handler(async ({ data }) => {
    const viewer = getCurrentUser();
    if (!viewer || viewer.role !== "ADMIN") {
      throw new Error("Only admins can manage service categories.");
    }

    if (data.id) {
      return updateServiceCategory(data.id, data);
    }

    return createServiceCategory(data);
  });

const removeServiceCategory = createServerFn({ method: "POST" })
  .inputValidator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const viewer = getCurrentUser();
    if (!viewer || viewer.role !== "ADMIN") {
      throw new Error("Only admins can manage service categories.");
    }

    return deleteServiceCategory(data.id);
  });

export const Route = createFileRoute("/admin-categories")({
  loader: () => loadAdminCategoriesData(),
  head: () => ({ meta: [{ title: "Admin Categories - Servio" }] }),
  component: AdminCategories,
});

function AdminCategories() {
  const data = useLoaderData({ from: "/admin-categories" });
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<ServiceCategoryInput>({
    name: "",
    slug: "",
    description: "",
    iconName: "",
    sortOrder: 0,
  });

  const categories = data.categories as ServiceCategoryRecord[];
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedId) ?? null,
    [categories, selectedId],
  );

  useEffect(() => {
    if (selectedCategory) {
      setCategoryForm({
        name: selectedCategory.name,
        slug: selectedCategory.slug,
        description: selectedCategory.description,
        iconName: selectedCategory.iconName,
        sortOrder: selectedCategory.sortOrder,
      });
      return;
    }

    setCategoryForm({
      name: "",
      slug: "",
      description: "",
      iconName: "",
      sortOrder: 0,
    });
  }, [selectedCategory]);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return categories;
    }

    return categories.filter((category) =>
      [category.name, category.slug, category.description, category.iconName]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [categories, search]);

  const isEditing = selectedCategory !== null;

  const title = isEditing ? "Edit category" : "Create category";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSaving(true);

    try {
      await saveServiceCategory({
        data: {
          id: selectedCategory?.id,
          name: categoryForm.name,
          slug: categoryForm.slug,
          description: categoryForm.description,
          iconName: categoryForm.iconName,
          sortOrder: categoryForm.sortOrder,
        },
      });

      await router.invalidate();
      setMessage("Category saved successfully.");
      if (!selectedCategory) {
        setSelectedId(null);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save category.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedCategory) return;

    setMessage(null);
    setIsDeleting(true);
    try {
      await removeServiceCategory({ data: { id: selectedCategory.id } });
      await router.invalidate();
      setSelectedId(null);
      setMessage("Category deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete category.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (!data.viewer || data.viewer.role !== "ADMIN") {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-soft">
          <h1 className="mt-4 text-xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in from the admin panel to manage service categories.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link to="/admin">Open admin panel</Link>
          </Button>
        </div>
      </div>
    );
  }

  const displayName =
    `${data.viewer.firstName} ${data.viewer.lastName}`.trim() || data.viewer.email;

  return (
    <AppShell userName={displayName} userRole="Admin" userAvatarUrl={data.viewer.avatarUrl}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary">Admin / Categories</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Service category manager</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Add, edit, and delete service categories used by the public services page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/admin">Back to admin</Link>
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedId(null);
                setMessage(null);
              }}
            >
              New category
            </Button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[370px_1fr]">
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Categories</h2>
                <p className="text-sm text-muted-foreground">
                  {categories.length} categories in the database.
                </p>
              </div>
              <Badge variant="secondary">Admin</Badge>
            </div>

            <div className="mb-4">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search categories..."
              />
            </div>

            <div className="space-y-3">
              {filteredCategories.length ? (
                filteredCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedId(category.id)}
                    className={`block w-full rounded-2xl border p-4 text-left transition-all hover:border-primary/60 hover:bg-primary/5 ${
                      selectedId === category.id ? "border-primary bg-primary/5" : "border-border bg-background"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{category.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                      </div>
                      <Badge variant="outline">{category.jobCount} jobs</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <span>Slug: {category.slug}</span>
                      <span>Icon: {category.iconName || "None"}</span>
                      <span>Sort order: {category.sortOrder}</span>
                      <span>Pros: {category.proCount}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No categories match your search.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground">
                  {isEditing ? "Update existing category details." : "Create a new category record."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isEditing ? (
                  <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                ) : null}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="category-name">
                  Name
                </label>
                <Input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="category-slug">
                  Slug
                </label>
                <Input
                  id="category-slug"
                  value={categoryForm.slug}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, slug: event.target.value }))
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="category-icon">
                  Icon name
                </label>
                <Input
                  id="category-icon"
                  value={categoryForm.iconName}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, iconName: event.target.value }))
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="category-sort-order">
                  Sort order
                </label>
                <Input
                  id="category-sort-order"
                  type="number"
                  value={categoryForm.sortOrder ?? 0}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      sortOrder: Number(event.target.value) || 0,
                    }))
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="category-description">
                  Description
                </label>
                <Textarea
                  id="category-description"
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="mt-2 h-32"
                />
              </div>

              {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : isEditing ? "Save changes" : "Create category"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedId(null);
                    setMessage(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
