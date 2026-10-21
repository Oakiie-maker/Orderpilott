import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, UtensilsCrossed, GripVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/context/RestaurantContext';
import { StatusBadge, EmptyState, ConfirmDialog } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import type { Category, Product } from '@/types/database';

export default function MenuManagement() {
  const { activeRestaurant, role } = useRestaurant();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [showProdModal, setShowProdModal] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'product'; id: string; name: string } | null>(null);

  const canEdit = role === 'owner' || role === 'manager';

  const load = useCallback(async () => {
    if (!activeRestaurant) return;
    setLoading(true); setError('');
    try {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').eq('restaurant_id', activeRestaurant.id).order('display_order'),
        supabase.from('products').select('*').eq('restaurant_id', activeRestaurant.id).order('created_at'),
      ]);
      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;
      setCategories((catRes.data ?? []) as Category[]);
      setProducts((prodRes.data ?? []) as Product[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [activeRestaurant]);

  useEffect(() => { load(); }, [load]);

  const saveCategory = async (name: string, description: string) => {
    if (!activeRestaurant) return;
    try {
      if (editingCat) {
        const { error } = await supabase.from('categories').update({ name, description }).eq('id', editingCat.id);
        if (error) throw error;
      } else {
        const maxOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.display_order)) : 0;
        const { error } = await supabase.from('categories').insert({ restaurant_id: activeRestaurant.id, name, description, display_order: maxOrder + 1 });
        if (error) throw error;
      }
      setShowCatModal(false); setEditingCat(null); load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    }
  };

  const saveProduct = async (data: Partial<Product>) => {
    if (!activeRestaurant) return;
    try {
      if (editingProd) {
        const { error } = await supabase.from('products').update({
          name: data.name, description: data.description, price: data.price,
          category_id: data.category_id, image_url: data.image_url,
          is_available: data.is_available, preparation_time_minutes: data.preparation_time_minutes,
        }).eq('id', editingProd.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert({
          restaurant_id: activeRestaurant.id, category_id: data.category_id,
          name: data.name, description: data.description ?? '', price: data.price,
          image_url: data.image_url ?? '', is_available: data.is_available ?? true,
          preparation_time_minutes: data.preparation_time_minutes ?? 10,
        });
        if (error) throw error;
      }
      setShowProdModal(false); setEditingProd(null); load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'category') {
        await supabase.from('categories').update({ is_active: false }).eq('id', deleteTarget.id);
      } else {
        await supabase.from('products').update({ is_available: false }).eq('id', deleteTarget.id);
      }
      setDeleteTarget(null); load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const toggleAvailable = async (product: Product) => {
    await supabase.from('products').update({ is_available: !product.is_available }).eq('id', product.id);
    load();
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-200 border-t-primary-600" /></div>;
  if (error) return <div className="rounded-lg bg-error-50 p-4 text-sm text-error-700">{error}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy-900">Menu Management</h1>
        {canEdit && (
          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => { setEditingCat(null); setShowCatModal(true); }}><Plus className="h-4 w-4" /> Category</button>
            <button className="btn-primary" onClick={() => { setEditingProd(null); setShowProdModal(true); }} disabled={categories.length === 0}><Plus className="h-4 w-4" /> Add Product</button>
          </div>
        )}
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={<UtensilsCrossed className="h-10 w-10" />} title="Start building your menu"
          description="Create a category first, then add products to it. For example: 'Starters', 'Mains', 'Drinks'."
          action={canEdit ? <button className="btn-primary" onClick={() => { setEditingCat(null); setShowCatModal(true); }}>Create Your First Category</button> : undefined} />
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const catProducts = products.filter((p) => p.category_id === cat.id);
            return (
              <div key={cat.id} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-navy-100 bg-navy-50 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 text-navy-300" />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-navy-900">{cat.name}</h3>
                      {cat.description && <p className="truncate text-xs text-navy-500">{cat.description}</p>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => { setEditingCat(cat); setShowCatModal(true); }} className="rounded-lg p-2 text-navy-500 hover:bg-navy-100"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget({ type: 'category', id: cat.id, name: cat.name })} className="rounded-lg p-2 text-navy-500 hover:bg-error-50 hover:text-error-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
                {catProducts.length === 0 ? (
                  <div className="px-5 py-6 text-center text-sm text-navy-400">
                    No products yet.
                    {canEdit && <button className="ml-2 font-medium text-primary-600 hover:text-primary-700" onClick={() => { setEditingProd(null); setShowProdModal(true); }}>Add one</button>}
                  </div>
                ) : (
                  <div className="divide-y divide-navy-50">
                    {catProducts.map((product) => (
                      <div key={product.id} className="flex items-center gap-4 px-5 py-3 hover:bg-navy-50/50">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-navy-100">
                          {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-navy-300"><UtensilsCrossed className="h-5 w-5" /></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-navy-900">{product.name}</span>
                            {!product.is_available && <span className="badge-error text-xs">Hidden</span>}
                          </div>
                          {product.description && <p className="truncate text-sm text-navy-500">{product.description}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-semibold text-navy-900">{formatCurrency(product.price, activeRestaurant?.currency)}</div>
                          <div className="text-xs text-navy-400">{product.preparation_time_minutes}m prep</div>
                        </div>
                        {canEdit && (
                          <div className="flex shrink-0 items-center gap-1">
                            <button onClick={() => toggleAvailable(product)} className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${product.is_available ? 'bg-success-100 text-success-700 hover:bg-success-500 hover:text-white' : 'bg-navy-100 text-navy-600 hover:bg-navy-200'}`}>{product.is_available ? 'Available' : 'Hidden'}</button>
                            <button onClick={() => { setEditingProd(product); setShowProdModal(true); }} className="rounded-lg p-2 text-navy-500 hover:bg-navy-100"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setDeleteTarget({ type: 'product', id: product.id, name: product.name })} className="rounded-lg p-2 text-navy-500 hover:bg-error-50 hover:text-error-600"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCatModal && <CategoryModal open={showCatModal} onClose={() => { setShowCatModal(false); setEditingCat(null); }} category={editingCat} onSave={saveCategory} />}
      {showProdModal && <ProductModal open={showProdModal} onClose={() => { setShowProdModal(false); setEditingProd(null); }} product={editingProd} categories={categories} currency={activeRestaurant?.currency ?? 'ZAR'} onSave={saveProduct} />}
      <ConfirmDialog open={deleteTarget !== null} title={deleteTarget?.type === 'category' ? 'Deactivate category' : 'Hide product'} message={`This will hide "${deleteTarget?.name}" from your live menu. Existing order records are preserved. You can reactivate it later.`} confirmLabel={deleteTarget?.type === 'category' ? 'Deactivate' : 'Hide'} danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

function CategoryModal({ open, onClose, category, onSave }: { open: boolean; onClose: () => void; category: Category | null; onSave: (name: string, desc: string) => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-navy-950/40 animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl animate-slide-up">
        <h3 className="text-lg font-semibold text-navy-900">{category ? 'Edit Category' : 'New Category'}</h3>
        <div className="mt-4 space-y-4">
          <div><label className="label">Category name</label><input className="input" placeholder="e.g. Starters" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div><label className="label">Description (optional)</label><textarea className="input" rows={2} placeholder="A short description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!name.trim()} onClick={() => onSave(name.trim(), description.trim())}>{category ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}

function ProductModal({ open, onClose, product, categories, currency, onSave }: { open: boolean; onClose: () => void; product: Product | null; categories: Category[]; currency: string; onSave: (data: Partial<Product>) => void }) {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product?.price?.toString() ?? '');
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '');
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '');
  const [available, setAvailable] = useState(product?.is_available ?? true);
  const [prepTime, setPrepTime] = useState(product?.preparation_time_minutes?.toString() ?? '10');
  if (!open) return null;

  const handleSave = () => {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) return;
    onSave({ name: name.trim(), description: description.trim(), price: priceNum, category_id: categoryId, image_url: imageUrl.trim(), is_available: available, preparation_time_minutes: parseInt(prepTime) || 10 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-navy-950/40 animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl animate-slide-up">
        <h3 className="text-lg font-semibold text-navy-900">{product ? 'Edit Product' : 'New Product'}</h3>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Product name</label><input className="input" placeholder="Margherita Pizza" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
            <div><label className="label">Category</label><select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div><label className="label">Description</label><textarea className="input" rows={2} placeholder="Fresh mozzarella, basil, tomato sauce" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label">Price ({currency})</label><input className="input" type="number" step="0.01" min="0" placeholder="89.00" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div><label className="label">Prep time (min)</label><input className="input" type="number" min="1" placeholder="15" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} /></div>
            <div><label className="label">Image URL</label><input className="input" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /></div>
          </div>
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" className="accent-primary-500" checked={available} onChange={(e) => setAvailable(e.target.checked)} /><span className="text-sm text-navy-700">Available for ordering</span></label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!name.trim() || !price} onClick={handleSave}>{product ? 'Save' : 'Add Product'}</button>
        </div>
      </div>
    </div>
  );
}
