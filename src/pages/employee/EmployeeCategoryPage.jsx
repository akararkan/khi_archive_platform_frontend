import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, RefreshCw, Search } from 'lucide-react'

import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/get-error-message'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/services/category'

function EmployeeCategoryPage() {
  const toast = useToast()

  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [view, setView] = useState('list') // 'list', 'create', 'edit'
  const [currentCategory, setCurrentCategory] = useState(null)

  const [form, setForm] = useState({ categoryCode: '', name: '', description: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredCategories = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase()

    if (!normalizedTerm) {
      return categories
    }

    return categories.filter((category) => {
      const value = `${category.categoryCode || ''} ${category.name || ''} ${category.description || ''}`
      return value.toLowerCase().includes(normalizedTerm)
    })
  }, [categories, searchTerm])

  const loadCategories = useCallback(async (options = {}) => {
    const { notifyError = false } = options

    setIsLoading(true)
    setError('')

    try {
      const data = await getCategories()
      setCategories(data || [])
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load categories')
      setError(message)

      if (notifyError) {
        toast.error('Could not refresh categories', message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCategories()
  }, [loadCategories])

  const handleOpenCreate = () => {
    setForm({ categoryCode: '', name: '', description: '' })
    setFormError('')
    setView('create')
  }

  const handleOpenEdit = (cat) => {
    setCurrentCategory(cat)
    setForm({ categoryCode: cat.categoryCode || '', name: cat.name || '', description: cat.description || '' })
    setFormError('')
    setView('edit')
  }

  const handleCloseForm = () => {
    setView('list')
    setCurrentCategory(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setIsSaving(true)

    try {
      if (view === 'create') {
        await createCategory({
          categoryCode: form.categoryCode.trim(),
          name: form.name,
          description: form.description,
        })
        toast.success('Category created', `${form.name} is now available.`)
      } else if (view === 'edit') {
        await updateCategory(currentCategory.categoryCode, {
          name: form.name,
          description: form.description,
        })
        toast.success('Category updated', `${form.name} changes were saved.`)
      }

      await loadCategories()
      handleCloseForm()
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to save category')
      setFormError(message)
      toast.error('Unable to save category', message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRequest = (category) => {
    setDeleteTarget(category)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteCategory(deleteTarget.categoryCode)

      toast.success('Category deleted', `${deleteTarget.name} was removed.`)
      setDeleteTarget(null)
      await loadCategories()
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to delete category')
      setError(message)
      toast.error('Unable to delete category', message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (view === 'create' || view === 'edit') {
    return (
      <EmployeeEntityPage 
        title={view === 'create' ? "New Category" : "Edit Category"} 
        description="Fill out the category details below."
      >
        <Card className="max-w-2xl border-border bg-card shadow-sm shadow-black/5">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Category Details</CardTitle>
            <CardDescription>All fields marked with * are required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
              {view === 'create' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="categoryCode">Category Code *</Label>
                  <Input
                    id="categoryCode"
                    value={form.categoryCode}
                    onChange={(e) => setForm({ ...form, categoryCode: e.target.value })}
                    placeholder="e.g., KHI_MUSIC"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="categoryCodeReadonly">Category Code</Label>
                  <Input id="categoryCodeReadonly" value={form.categoryCode} disabled />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Music"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional details about this category"
                />
              </div>

              {formError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              )}
            </form>
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={handleCloseForm} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="category-form" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Category
            </Button>
          </CardFooter>
        </Card>
      </EmployeeEntityPage>
    )
  }

  return (
    <EmployeeEntityPage 
      title="Categories" 
      description="Manage the primary categories used to classify archive objects."
      action={
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="size-4" />
          Add Category
        </Button>
      }
    >
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardContent className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredCategories.length} of {categories.length} records
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by code, name, or description"
                className="pl-8"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => loadCategories({ notifyError: true })}
              disabled={isLoading}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </Card>
      ) : error ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <CardContent className="space-y-4 px-6 py-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => loadCategories({ notifyError: true })}
            >
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/20 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
            <Plus className="size-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No categories found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Get started by creating your very first category logic to better organize the archive.
          </p>
          <Button onClick={handleOpenCreate} className="mt-6 gap-2">
            <Plus className="size-4" />
            Add Category
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card shadow-sm shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]">#</TableHead>
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No matching categories for this search.
                  </TableCell>
                </TableRow>
              ) : filteredCategories.map((cat, index) => (
                <TableRow key={cat.categoryCode}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {cat.categoryCode}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {cat.name}
                  </TableCell>
                  <TableCell className="max-w-[520px] whitespace-normal text-muted-foreground">
                    {cat.description || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => handleOpenEdit(cat)}>
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteRequest(cat)}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete category"
        description={
          deleteTarget
            ? `This will permanently remove "${deleteTarget.name}" (${deleteTarget.categoryCode}). This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Category"
        cancelLabel="Keep Category"
        confirmVariant="destructive"
        isProcessing={isDeleting}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null)
          }
        }}
      />
    </EmployeeEntityPage>
  )
}

export { EmployeeCategoryPage }
