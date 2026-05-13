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
  const [selectedMenu, setSelectedMenu] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Modal states
  const [isCreateModal, setIsCreateModal] = useState(false);
  const [isEditModal, setIsEditModal] = useState(false);
  const [isDeleteModal, setIsDeleteModal] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);

  // Form state
  const [dishForm, setDishForm] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    categoryId: '',
    menuId: '',
    isVeg: false,
    isVegan: false,
    status: 'AVAILABLE'
  });

  // Image upload
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (selectedMenu) {
      fetchCategories(selectedMenu);
      fetchDishes();
    }
  }, [selectedMenu]);

  useEffect(() => {
    if (selectedCategory) {
      fetchDishes();
    }
  }, [selectedCategory]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch user profile which includes restaurant info
      const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!profileResponse.ok) throw new Error('Failed to fetch profile');

      const profileData = await profileResponse.json();
      
      if (!profileData.restaurant) {
        toast.error('No restaurant assigned to your account');
        return;
      }

      const restaurantId = profileData.restaurant.id;

      // Fetch menus for this restaurant
      const menusResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/menus?restaurantId=${restaurantId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!menusResponse.ok) throw new Error('Failed to fetch menus');

      const menusData = await menusResponse.json();
      setMenus(menusData);

      // Auto-select first menu if available
      if (menusData.length > 0) {
        setSelectedMenu(menusData[0].id);
      }

    } catch (error) {
      toast.error(error.message || 'Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (menuId) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories?menuId=${menuId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

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
      const token = localStorage.getItem('token');
      
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/dishes?menuId=${selectedMenu}`;
      if (selectedCategory) {
        url += `&categoryId=${selectedCategory}`;
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
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dishes/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!response.ok) throw new Error('Image upload failed');

      const data = await response.json();
      return data.webpUrl; // Return the WebP optimized image URL
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  };

 // src/app/(user)/dishes/page.jsx
// Find the handleCreateDish function and fix it:

const handleCreateDish = async (e) => {
  e.preventDefault();
  try {
    setUploadProgress(10);

    // Upload image if selected
    let imageUrl = dishForm.image;
    if (imageFile) {
      setUploadProgress(30);
      imageUrl = await uploadImage();
      setUploadProgress(60);
    }

    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dishes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...dishForm,
        image: imageUrl,
        price: parseFloat(dishForm.price),
        menuId: selectedMenu
      })
    });

    setUploadProgress(80);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create dish');
    }

    const newDish = await response.json(); // ✅ FIX: Backend returns dish directly
    setDishes([...dishes, newDish]); // ✅ FIX: Use newDish instead of data.dish
    setIsCreateModal(false);
    resetForm();
    setUploadProgress(100);
    toast.success('Dish created successfully');
  } catch (error) {
    toast.error(error.message);
    console.error(error);
  } finally {
    setUploadProgress(0);
  }
};
 const handleUpdateDish = async (e) => {
  e.preventDefault();
  try {
    setUploadProgress(10);

    // Upload new image if selected
    let imageUrl = dishForm.image;
    if (imageFile) {
      setUploadProgress(30);
      imageUrl = await uploadImage();
      setUploadProgress(60);
    }

    const token = localStorage.getItem('token');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/dishes/${selectedDish.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...dishForm,
          image: imageUrl,
          price: parseFloat(dishForm.price)
        })
      }
    );

    setUploadProgress(80);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update dish');
    }

    const updatedDish = await response.json(); // ✅ FIX: Backend returns dish directly
    setDishes(dishes.map(d => d.id === selectedDish.id ? updatedDish : d)); // ✅ FIX
    setIsEditModal(false);
    resetForm();
    setUploadProgress(100);
    toast.success('Dish updated successfully');
  } catch (error) {
    toast.error(error.message);
    console.error(error);
  } finally {
    setUploadProgress(0);
  }
};

  const handleDeleteDish = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dishes/${selectedDish.id}`,
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

      setDishes(dishes.filter(d => d.id !== selectedDish.id));
      setIsDeleteModal(false);
      setSelectedDish(null);
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update status');
    }

    const updatedDish = await response.json(); // ✅ FIX: Backend returns dish directly
    setDishes(dishes.map(d => d.id === dishId ? updatedDish : d)); // ✅ FIX
    toast.success('Status updated successfully');
  } catch (error) {
    toast.error(error.message);
    console.error(error);
  }
};
  const openCreateModal = () => {
    resetForm();
    setSelectedDish(null);
    setIsCreateModal(true);
  };

  const openEditModal = (dish) => {
    setSelectedDish(dish);
    setDishForm({
      name: dish.name,
      description: dish.description || '',
      price: dish.price.toString(),
      image: dish.image || '',
      categoryId: dish.categoryId,
      menuId: dish.menuId,
      isVeg: dish.isVeg,
      isVegan: dish.isVegan,
      status: dish.status
    });
    setImagePreview(dish.image || '');
    setImageFile(null);
    setIsEditModal(true);
  };

  const openDeleteModal = (dish) => {
    setSelectedDish(dish);
    setIsDeleteModal(true);
  };

  const resetForm = () => {
    setDishForm({
      name: '',
      description: '',
      price: '',
      image: '',
      categoryId: '',
      menuId: '',
      isVeg: false,
      isVegan: false,
      status: 'AVAILABLE'
    });
    setImageFile(null);
    setImagePreview('');
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      AVAILABLE: 'bg-green-100 text-green-800',
      UNAVAILABLE: 'bg-red-100 text-red-800',
      OUT_OF_STOCK: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dishes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Dishes</h1>
        <p className="text-gray-600">Manage your menu items</p>
      </div>

      {/* Filters and Add Button */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4 flex-1 w-full sm:w-auto">
          {/* Menu Filter */}
          <select
            value={selectedMenu}
            onChange={(e) => setSelectedMenu(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Menu</option>
            {menus.map((menu) => (
              <option key={menu.id} value={menu.id}>
                {menu.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!selectedMenu}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={openCreateModal}
          disabled={!selectedMenu}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          Add Dish
        </button>
      </div>

      {/* Dishes Grid */}
      {!selectedMenu ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">Please select a menu to view dishes</p>
        </div>
      ) : dishes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600 mb-4">No dishes found</p>
          <button
            onClick={openCreateModal}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first dish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dishes.map((dish) => (
            <div key={dish.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              {/* Dish Image */}
              <div className="h-48 bg-gray-200 relative">
                {dish.image ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}/${dish.image}`}
                    alt={dish.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                {/* Dietary Badges */}
                <div className="absolute top-2 left-2 flex gap-2">
                  {dish.isVeg && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      VEG
                    </span>
                  )}
                  {dish.isVegan && (
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                      VEGAN
                    </span>
                  )}
                </div>
              </div>

              {/* Dish Info */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">{dish.name}</h3>
                  <span className="text-lg font-bold text-blue-600">₹{dish.price}</span>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {dish.description || 'No description'}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500">
                    {categories.find(c => c.id === dish.categoryId)?.name || 'Uncategorized'}
                  </span>
                  {getStatusBadge(dish.status)}
                </div>

                {/* Status Dropdown */}
                <div className="mb-3">
                  <select
                    value={dish.status}
                    onChange={(e) => handleStatusChange(dish.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(dish)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(dish)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dish Modal */}
      <Modal
        isOpen={isCreateModal}
        onClose={() => setIsCreateModal(false)}
        title="Add New Dish"
      >
        <form onSubmit={handleCreateDish} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dish Name *
            </label>
            <input
              type="text"
              value={dishForm.name}
              onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                value={dishForm.price}
                onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
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
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dish Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {imagePreview && (
              <div className="mt-2">
                <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg" />
              </div>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">Uploading... {uploadProgress}%</p>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={dishForm.isVeg}
                onChange={(e) => setDishForm({ ...dishForm, isVeg: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Vegetarian</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={dishForm.isVegan}
                onChange={(e) => setDishForm({ ...dishForm, isVegan: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Vegan</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadProgress > 0 && uploadProgress < 100}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Dish
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Dish Modal */}
      <Modal
        isOpen={isEditModal}
        onClose={() => setIsEditModal(false)}
        title="Edit Dish"
      >
        <form onSubmit={handleUpdateDish} className="space-y-4">
          {/* Same form fields as create modal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dish Name *
            </label>
            <input
              type="text"
              value={dishForm.name}
              onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                value={dishForm.price}
                onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
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
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dish Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {imagePreview && (
              <div className="mt-2">
                <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg" />
              </div>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">Uploading... {uploadProgress}%</p>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={dishForm.isVeg}
                onChange={(e) => setDishForm({ ...dishForm, isVeg: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Vegetarian</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={dishForm.isVegan}
                onChange={(e) => setDishForm({ ...dishForm, isVegan: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Vegan</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsEditModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadProgress > 0 && uploadProgress < 100}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Dish
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModal}
        onClose={() => setIsDeleteModal(false)}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete "{selectedDish?.name}"? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setIsDeleteModal(false)}
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