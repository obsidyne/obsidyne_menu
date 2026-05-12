// src/app/(user)/categories/page.jsx
'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { toast } from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from '@/components/SortableItem';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState('all');
  
  // Modal states
  const [isCategoryModal, setIsCategoryModal] = useState(false);
  const [isDeleteModal, setIsDeleteModal] = useState(false);
  const [isReorderModal, setIsReorderModal] = useState(false);
  const [isDishReorderModal, setIsDishReorderModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [reorderingCategory, setReorderingCategory] = useState(null);
  const [categoryDishes, setCategoryDishes] = useState([]);

  // Form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    image: '',
    menuId: '',
    isActive: true
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchMenus();
  }, []);

  useEffect(() => {
    if (menus.length > 0) {
      fetchCategories();
    }
  }, [selectedMenu, menus]);

  const fetchMenus = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/restaurants/${user.restaurantId}/menus`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch menus');

      const data = await response.json();
      setMenus(data);
    } catch (error) {
      toast.error('Failed to load menus');
      console.error(error);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/categories`;
      if (selectedMenu !== 'all') {
        url += `?menuId=${selectedMenu}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch categories');

      const data = await response.json();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryDishes = async (categoryId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dishes?categoryId=${categoryId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch dishes');

      const data = await response.json();
      setCategoryDishes(data);
    } catch (error) {
      toast.error('Failed to load dishes');
      console.error(error);
    }
  };

  const handleCategoryDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);

      const reorderedCategories = arrayMove(categories, oldIndex, newIndex);
      
      // Update local state immediately for smooth UX
      setCategories(reorderedCategories);

      // Prepare updates with new sort orders
      const updates = reorderedCategories.map((cat, index) => ({
        id: cat.id,
        sortOrder: index
      }));

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/categories/reorder`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ updates })
          }
        );

        if (!response.ok) throw new Error('Failed to reorder categories');

        toast.success('Categories reordered successfully');
        fetchCategories(); // Refresh to get updated data
      } catch (error) {
        toast.error(error.message);
        fetchCategories(); // Revert on error
      }
    }
  };

  const handleDishDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = categoryDishes.findIndex((dish) => dish.id === active.id);
      const newIndex = categoryDishes.findIndex((dish) => dish.id === over.id);

      const reorderedDishes = arrayMove(categoryDishes, oldIndex, newIndex);
      
      // Update local state immediately for smooth UX
      setCategoryDishes(reorderedDishes);

      // Prepare updates with new sort orders
      const updates = reorderedDishes.map((dish, index) => ({
        id: dish.id,
        sortOrder: index
      }));

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/dishes/reorder`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ updates })
          }
        );

        if (!response.ok) throw new Error('Failed to reorder dishes');

        toast.success('Dishes reordered successfully');
      } catch (error) {
        toast.error(error.message);
        fetchCategoryDishes(reorderingCategory.id); // Revert on error
      }
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(categoryForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create category');
      }

      const data = await response.json();
      setCategories([...categories, data]);
      setIsCategoryModal(false);
      resetForm();
      toast.success('Category created successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${editingCategory.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(categoryForm)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update category');
      }

      const data = await response.json();
      setCategories(categories.map(c => c.id === editingCategory.id ? data : c));
      setIsCategoryModal(false);
      resetForm();
      toast.success('Category updated successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleDeleteCategory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${deletingCategory.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete category');
      }

      setCategories(categories.filter(c => c.id !== deletingCategory.id));
      setIsDeleteModal(false);
      setDeletingCategory(null);
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleToggleStatus = async (categoryId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${categoryId}/toggle-status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to toggle status');

      const data = await response.json();
      setCategories(categories.map(c => c.id === categoryId ? data.category : c));
      toast.success(data.message);
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setEditingCategory(null);
    setCategoryForm({
      ...categoryForm,
      menuId: selectedMenu !== 'all' ? selectedMenu : (menus[0]?.id || '')
    });
    setIsCategoryModal(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      image: category.image || '',
      menuId: category.menuId,
      isActive: category.isActive
    });
    setIsCategoryModal(true);
  };

  const openDeleteModal = (category) => {
    setDeletingCategory(category);
    setIsDeleteModal(true);
  };

  const openReorderModal = () => {
    setIsReorderModal(true);
  };

  const openDishReorderModal = async (category) => {
    setReorderingCategory(category);
    await fetchCategoryDishes(category.id);
    setIsDishReorderModal(true);
  };

  const resetForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      image: '',
      menuId: '',
      isActive: true
    });
    setEditingCategory(null);
  };

  const filteredCategories = categories;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Categories</h1>
        <p className="text-gray-600">Manage your menu categories</p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4 flex-1 w-full sm:w-auto">
          <select
            value={selectedMenu}
            onChange={(e) => setSelectedMenu(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Menus</option>
            {menus.map((menu) => (
              <option key={menu.id} value={menu.id}>
                {menu.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={openReorderModal}
            className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            disabled={filteredCategories.length === 0}
          >
            Reorder Categories
          </button>
          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-none px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + Add Category
          </button>
        </div>
      </div>

      {/* Categories List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No categories found</p>
          <button
            onClick={openCreateModal}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first category
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Menu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dishes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sort Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {category.image ? (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="h-10 w-10 rounded-lg mr-3 object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-semibold">
                              {category.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{category.name}</div>
                          {category.description && (
                            <div className="text-sm text-gray-500 line-clamp-1">
                              {category.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{category.menu.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openDishReorderModal(category)}
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        {category._count.dishes} dishes
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{category.sortOrder}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          category.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(category)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(category.id)}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            category.isActive
                              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {category.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openDeleteModal(category)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCategoryModal}
        onClose={() => {
          setIsCategoryModal(false);
          resetForm();
        }}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
      >
        <form
          onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Menu *
            </label>
            <select
              value={categoryForm.menuId}
              onChange={(e) => setCategoryForm({ ...categoryForm, menuId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a menu</option>
              {menus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Appetizers, Main Course"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Brief description of this category"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={categoryForm.image}
              onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="categoryIsActive"
              checked={categoryForm.isActive}
              onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="categoryIsActive" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCategoryModal(false);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingCategory ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reorder Categories Modal */}
      <Modal
        isOpen={isReorderModal}
        onClose={() => setIsReorderModal(false)}
        title="Reorder Categories"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Drag and drop categories to reorder them. The order will be reflected in your menu.
          </p>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <SortableContext
              items={categories.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {categories.map((category) => (
                  <SortableItem key={category.id} id={category.id}>
                    {(listeners, isDragging) => (
                      <div
                        className={`flex items-center gap-3 p-4 bg-white border-2 rounded-lg ${
                          isDragging ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                        }`}
                      >
                        <div
                          {...listeners}
                          className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded"
                        >
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 8h16M4 16h16"
                            />
                          </svg>
                        </div>
                        {category.image ? (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {category.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{category.name}</div>
                          <div className="text-sm text-gray-500">
                            {category._count.dishes} dishes
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          Order: {category.sortOrder}
                        </div>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              onClick={() => setIsReorderModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Reorder Dishes Modal */}
      <Modal
        isOpen={isDishReorderModal}
        onClose={() => {
          setIsDishReorderModal(false);
          setReorderingCategory(null);
          setCategoryDishes([]);
        }}
        title={`Reorder Dishes - ${reorderingCategory?.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Drag and drop dishes to reorder them within this category.
          </p>
          
          {categoryDishes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No dishes in this category
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDishDragEnd}
            >
              <SortableContext
                items={categoryDishes.map(d => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {categoryDishes.map((dish) => (
                    <SortableItem key={dish.id} id={dish.id}>
                      {(listeners, isDragging) => (
                        <div
                          className={`flex items-center gap-3 p-4 bg-white border-2 rounded-lg ${
                            isDragging ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                          }`}
                        >
                          <div
                            {...listeners}
                            className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded"
                          >
                            <svg
                              className="w-5 h-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 8h16M4 16h16"
                              />
                            </svg>
                          </div>
                          {dish.image ? (
                            <img
                              src={dish.image}
                              alt={dish.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {dish.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{dish.name}</div>
                            <div className="text-sm text-gray-500">₹{dish.price.toFixed(2)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {dish.isVeg && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                Veg
                              </span>
                            )}
                            <div className="text-sm text-gray-500">
                              Order: {dish.sortOrder}
                            </div>
                          </div>
                        </div>
                      )}
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              onClick={() => {
                setIsDishReorderModal(false);
                setReorderingCategory(null);
                setCategoryDishes([]);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModal}
        onClose={() => {
          setIsDeleteModal(false);
          setDeletingCategory(null);
        }}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete the category "{deletingCategory?.name}"?
          </p>

          {deletingCategory && deletingCategory._count.dishes > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                Warning: This category has {deletingCategory._count.dishes} dish(es). Deleting this
                category will also delete all associated dishes.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => {
                setIsDeleteModal(false);
                setDeletingCategory(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteCategory}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete Category
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}