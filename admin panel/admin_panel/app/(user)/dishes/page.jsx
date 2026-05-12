// src/app/(user)/dishes/page.jsx
'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { toast } from 'react-hot-toast';

export default function DishesPage() {
  const [dishes, setDishes] = useState([]);
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modal states
  const [isDishModal, setIsDishModal] = useState(false);
  const [isDeleteModal, setIsDeleteModal] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [deletingDish, setDeletingDish] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [dishForm, setDishForm] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    isVeg: false,
    isVegan: false,
    status: 'AVAILABLE',
    menuId: '',
    categoryId: ''
  });

  useEffect(() => {
    fetchMenus();
  }, []);

  useEffect(() => {
    if (menus.length > 0) {
      fetchCategories();
      fetchDishes();
    }
  }, [selectedMenu, selectedCategory, menus]);

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
    }
  };

  const fetchDishes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/dishes`;
      const params = new URLSearchParams();
      
      if (selectedMenu !== 'all') {
        params.append('menuId', selectedMenu);
      }
      
      if (selectedCategory !== 'all') {
        params.append('categoryId', selectedCategory);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch dishes');

      const data = await response.json();
      setDishes(data);
    } catch (error) {
      toast.error('Failed to load dishes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (10MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      setUploadingImage(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dishes/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const data = await response.json();
      // Use WebP version as the primary image
      setDishForm({ ...dishForm, image: `${process.env.NEXT_PUBLIC_API_URL}${data.webpUrl}` });
      toast.success('Image uploaded and optimized successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateDish = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dishes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dishForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create dish');
      }

      const data = await response.json();
      setDishes([...dishes, data]);
      setIsDishModal(false);
      resetForm();
      toast.success('Dish created successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleUpdateDish = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dishes/${editingDish.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(dishForm)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update dish');
      }

      const data = await response.json();
      setDishes(dishes.map(d => d.id === editingDish.id ? data : d));
      setIsDishModal(false);
      resetForm();
      toast.success('Dish updated successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleDeleteDish = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dishes/${deletingDish.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete dish');
      }

      setDishes(dishes.filter(d => d.id !== deletingDish.id));
      setIsDeleteModal(false);
      setDeletingDish(null);
      toast.success('Dish deleted successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleStatusChange = async (dishId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dishes/${dishId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        }
      );

      if (!response.ok) throw new Error('Failed to update status');

      const data = await response.json();
      setDishes(dishes.map(d => d.id === dishId ? data : d));
      toast.success('Status updated successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setEditingDish(null);
    
    const defaultMenuId = selectedMenu !== 'all' ? selectedMenu : (menus[0]?.id || '');
    const filteredCategories = categories.filter(c => 
      selectedMenu === 'all' || c.menuId === selectedMenu
    );
    const defaultCategoryId = selectedCategory !== 'all' 
      ? selectedCategory 
      : (filteredCategories[0]?.id || '');

    setDishForm({
      ...dishForm,
      menuId: defaultMenuId,
      categoryId: defaultCategoryId
    });
    setIsDishModal(true);
  };

  const openEditModal = (dish) => {
    setEditingDish(dish);
    setDishForm({
      name: dish.name,
      description: dish.description || '',
      price: dish.price.toString(),
      image: dish.image || '',
      isVeg: dish.isVeg,
      isVegan: dish.isVegan,
      status: dish.status,
      menuId: dish.menuId,
      categoryId: dish.categoryId
    });
    setIsDishModal(true);
  };

  const openDeleteModal = (dish) => {
    setDeletingDish(dish);
    setIsDeleteModal(true);
  };

  const resetForm = () => {
    setDishForm({
      name: '',
      description: '',
      price: '',
      image: '',
      isVeg: false,
      isVegan: false,
      status: 'AVAILABLE',
      menuId: '',
      categoryId: ''
    });
    setEditingDish(null);
  };

  const formCategories = categories.filter(c => 
    !dishForm.menuId || c.menuId === dishForm.menuId
  );

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'UNAVAILABLE':
        return 'bg-red-100 text-red-800';
      case 'OUT_OF_STOCK':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Available';
      case 'UNAVAILABLE':
        return 'Unavailable';
      case 'OUT_OF_STOCK':
        return 'Out of Stock';
      default:
        return status;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Dishes</h1>
        <p className="text-gray-600">Manage your restaurant's dishes</p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4 flex-1 w-full sm:w-auto flex-wrap">
          <select
            value={selectedMenu}
            onChange={(e) => {
              setSelectedMenu(e.target.value);
              setSelectedCategory('all');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Menus</option>
            {menus.map((menu) => (
              <option key={menu.id} value={menu.id}>
                {menu.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories
              .filter(c => selectedMenu === 'all' || c.menuId === selectedMenu)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </div>

        <button
          onClick={openCreateModal}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
        >
          + Add Dish
        </button>
      </div>

      {/* Dishes Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dishes...</p>
        </div>
      ) : dishes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No dishes found</p>
          <button
            onClick={openCreateModal}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first dish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dishes.map((dish) => (
            <div
              key={dish.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Dish Image */}
              <div className="relative h-48 bg-gray-200">
                {dish.image ? (
                  <img
                    src={dish.image}
                    alt={dish.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                    <svg
                      className="w-16 h-16 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                
                {/* Dietary badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {dish.isVeg && (
                    <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                      Veg
                    </span>
                  )}
                  {dish.isVegan && (
                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                      Vegan
                    </span>
                  )}
                </div>

                {/* Status badge */}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(dish.status)}`}>
                    {getStatusLabel(dish.status)}
                  </span>
                </div>
              </div>

              {/* Dish Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">
                  {dish.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2 h-10">
                  {dish.description || 'No description'}
                </p>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-bold text-green-600">
                    ₹{dish.price.toFixed(2)}
                  </span>
                  <div className="text-xs text-gray-500">
                    {dish.category.name}
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="mb-3">
                  <select
                    value={dish.status}
                    onChange={(e) => handleStatusChange(dish.id, e.target.value)}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(dish)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(dish)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isDishModal}
        onClose={() => {
          setIsDishModal(false);
          resetForm();
        }}
        title={editingDish ? 'Edit Dish' : 'Create Dish'}
      >
        <form
          onSubmit={editingDish ? handleUpdateDish : handleCreateDish}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Menu *
              </label>
              <select
                value={dishForm.menuId}
                onChange={(e) => {
                  setDishForm({ 
                    ...dishForm, 
                    menuId: e.target.value,
                    categoryId: ''
                  });
                }}
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
                Category *
              </label>
              <select
                value={dishForm.categoryId}
                onChange={(e) => setDishForm({ ...dishForm, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={!dishForm.menuId}
              >
                <option value="">Select a category</option>
                {formCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dish Name *
            </label>
            <input
              type="text"
              value={dishForm.name}
              onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Margherita Pizza"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={dishForm.description}
              onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Describe the dish..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={dishForm.price}
              onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dish Image
            </label>
            <div className="space-y-2">
              {dishForm.image && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-300">
                  <img
                    src={dishForm.image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setDishForm({ ...dishForm, image: '' })}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="dish-image-upload"
                  disabled={uploadingImage}
                />
                <label
                  htmlFor="dish-image-upload"
                  className={`flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg cursor-pointer hover:bg-blue-700 transition-colors ${
                    uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploadingImage ? 'Uploading & Optimizing...' : dishForm.image ? 'Change Image' : 'Upload Image'}
                </label>
                {dishForm.image && (
                  <button
                    type="button"
                    onClick={() => setDishForm({ ...dishForm, image: '' })}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Upload an image (Max 10MB). Images will be automatically optimized to WebP format.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={dishForm.status}
              onChange={(e) => setDishForm({ ...dishForm, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="AVAILABLE">Available</option>
              <option value="UNAVAILABLE">Unavailable</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isVeg"
                checked={dishForm.isVeg}
                onChange={(e) => setDishForm({ ...dishForm, isVeg: e.target.checked })}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="isVeg" className="ml-2 text-sm text-gray-700">
                Vegetarian
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isVegan"
                checked={dishForm.isVegan}
                onChange={(e) => setDishForm({ ...dishForm, isVegan: e.target.checked })}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="isVegan" className="ml-2 text-sm text-gray-700">
                Vegan
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsDishModal(false);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={uploadingImage}
            >
              {editingDish ? 'Update Dish' : 'Create Dish'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModal}
        onClose={() => {
          setIsDeleteModal(false);
          setDeletingDish(null);
        }}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete "{deletingDish?.name}"? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => {
                setIsDeleteModal(false);
                setDeletingDish(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteDish}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete Dish
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}