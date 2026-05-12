// src/app/(user)/combos/page.jsx
'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { toast } from 'react-hot-toast';

export default function CombosPage() {
  const [combos, setCombos] = useState([]);
  const [menus, setMenus] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState('all');
  
  // Modal states
  const [isComboModal, setIsComboModal] = useState(false);
  const [isDeleteModal, setIsDeleteModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [deletingCombo, setDeletingCombo] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [comboForm, setComboForm] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    discount: '0',
    isActive: true,
    menuId: '',
    dishes: [] // Array of { dishId, quantity }
  });

  // Dish selection
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [dishQuantities, setDishQuantities] = useState({});

  useEffect(() => {
    fetchMenus();
  }, []);

  useEffect(() => {
    if (menus.length > 0) {
      fetchCombos();
    }
  }, [selectedMenu, menus]);

  useEffect(() => {
    if (comboForm.menuId) {
      fetchDishesForMenu(comboForm.menuId);
    }
  }, [comboForm.menuId]);

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

  const fetchCombos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/combos`;
      if (selectedMenu !== 'all') {
        url += `?menuId=${selectedMenu}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch combos');

      const data = await response.json();
      setCombos(data);
    } catch (error) {
      toast.error('Failed to load combos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDishesForMenu = async (menuId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dishes?menuId=${menuId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch dishes');

      const data = await response.json();
      setDishes(data.filter(d => d.status === 'AVAILABLE'));
    } catch (error) {
      toast.error('Failed to load dishes');
      console.error(error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      setUploadingImage(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/combos/upload`, {
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
      setComboForm({ ...comboForm, image: `${process.env.NEXT_PUBLIC_API_URL}${data.webpUrl}` });
      toast.success('Image uploaded and optimized successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDishToggle = (dishId) => {
    if (selectedDishes.includes(dishId)) {
      setSelectedDishes(selectedDishes.filter(id => id !== dishId));
      const newQuantities = { ...dishQuantities };
      delete newQuantities[dishId];
      setDishQuantities(newQuantities);
    } else {
      setSelectedDishes([...selectedDishes, dishId]);
      setDishQuantities({ ...dishQuantities, [dishId]: 1 });
    }
  };

  const handleQuantityChange = (dishId, quantity) => {
    const qty = parseInt(quantity);
    if (qty > 0) {
      setDishQuantities({ ...dishQuantities, [dishId]: qty });
    }
  };

  const calculateOriginalPrice = () => {
    let total = 0;
    selectedDishes.forEach(dishId => {
      const dish = dishes.find(d => d.id === dishId);
      if (dish) {
        total += dish.price * (dishQuantities[dishId] || 1);
      }
    });
    return total;
  };

  const calculateSavings = () => {
    const original = calculateOriginalPrice();
    const comboPrice = parseFloat(comboForm.price) || 0;
    return original - comboPrice;
  };

  const handleCreateCombo = async (e) => {
    e.preventDefault();

    if (selectedDishes.length === 0) {
      toast.error('Please select at least one dish');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const dishesData = selectedDishes.map(dishId => ({
        dishId,
        quantity: dishQuantities[dishId] || 1
      }));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/combos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...comboForm,
          dishes: dishesData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create combo');
      }

      const data = await response.json();
      setCombos([...combos, data]);
      setIsComboModal(false);
      resetForm();
      toast.success('Combo created successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleUpdateCombo = async (e) => {
    e.preventDefault();

    if (selectedDishes.length === 0) {
      toast.error('Please select at least one dish');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const dishesData = selectedDishes.map(dishId => ({
        dishId,
        quantity: dishQuantities[dishId] || 1
      }));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/combos/${editingCombo.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...comboForm,
            dishes: dishesData
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update combo');
      }

      const data = await response.json();
      setCombos(combos.map(c => c.id === editingCombo.id ? data : c));
      setIsComboModal(false);
      resetForm();
      toast.success('Combo updated successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleDeleteCombo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/combos/${deletingCombo.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete combo');
      }

      setCombos(combos.filter(c => c.id !== deletingCombo.id));
      setIsDeleteModal(false);
      setDeletingCombo(null);
      toast.success('Combo deleted successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleToggleStatus = async (comboId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/combos/${comboId}/toggle-status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to toggle status');

      const data = await response.json();
      setCombos(combos.map(c => c.id === comboId ? data.combo : c));
      toast.success(data.message);
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setEditingCombo(null);
    const defaultMenuId = selectedMenu !== 'all' ? selectedMenu : (menus[0]?.id || '');
    setComboForm({
      ...comboForm,
      menuId: defaultMenuId
    });
    setIsComboModal(true);
  };

  const openEditModal = (combo) => {
    setEditingCombo(combo);
    setComboForm({
      name: combo.name,
      description: combo.description || '',
      price: combo.price.toString(),
      image: combo.image || '',
      discount: combo.discount?.toString() || '0',
      isActive: combo.isActive,
      menuId: combo.menuId,
      dishes: []
    });

    // Set selected dishes and quantities
    const dishIds = combo.comboDishes.map(cd => cd.dishId);
    const quantities = {};
    combo.comboDishes.forEach(cd => {
      quantities[cd.dishId] = cd.quantity;
    });

    setSelectedDishes(dishIds);
    setDishQuantities(quantities);
    setIsComboModal(true);
  };

  const openDeleteModal = (combo) => {
    setDeletingCombo(combo);
    setIsDeleteModal(true);
  };

  const resetForm = () => {
    setComboForm({
      name: '',
      description: '',
      price: '',
      image: '',
      discount: '0',
      isActive: true,
      menuId: '',
      dishes: []
    });
    setSelectedDishes([]);
    setDishQuantities({});
    setEditingCombo(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Combos</h1>
        <p className="text-gray-600">Manage your meal combos and special offers</p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
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

        <button
          onClick={openCreateModal}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
        >
          + Add Combo
        </button>
      </div>

      {/* Combos Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading combos...</p>
        </div>
      ) : combos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No combos found</p>
          <button
            onClick={openCreateModal}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first combo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {combos.map((combo) => {
            const originalPrice = combo.comboDishes.reduce(
              (sum, cd) => sum + (cd.dish.price * cd.quantity),
              0
            );
            const savings = originalPrice - combo.price;
            const savingsPercent = ((savings / originalPrice) * 100).toFixed(0);

            return (
              <div
                key={combo.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Combo Image */}
                <div className="relative h-48 bg-gray-200">
                  {combo.image ? (
                    <img
                      src={combo.image}
                      alt={combo.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200">
                      <svg
                        className="w-16 h-16 text-purple-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        combo.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {combo.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Savings badge */}
                  {savings > 0 && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        Save {savingsPercent}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Combo Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">
                    {combo.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-10">
                    {combo.description || 'No description'}
                  </p>

                  {/* Dishes in combo */}
                  <div className="mb-3 space-y-1">
                    <p className="text-xs font-medium text-gray-500 mb-1">Includes:</p>
                    {combo.comboDishes.map((cd) => (
                      <div key={cd.id} className="flex items-center text-xs text-gray-600">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 font-medium">
                          {cd.quantity}
                        </span>
                        <span className="line-clamp-1">{cd.dish.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="border-t pt-3 mb-3">
                    {savings > 0 && (
                      <div className="text-xs text-gray-500 line-through">
                        Original: ₹{originalPrice.toFixed(2)}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-600">
                        ₹{combo.price.toFixed(2)}
                      </span>
                      {savings > 0 && (
                        <span className="text-sm text-green-600 font-medium">
                          Save ₹{savings.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(combo)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(combo.id)}
                      className={`px-3 py-2 text-sm rounded transition-colors ${
                        combo.isActive
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {combo.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => openDeleteModal(combo)}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isComboModal}
        onClose={() => {
          setIsComboModal(false);
          resetForm();
        }}
        title={editingCombo ? 'Edit Combo' : 'Create Combo'}
      >
        <form
          onSubmit={editingCombo ? handleUpdateCombo : handleCreateCombo}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Menu *
            </label>
            <select
              value={comboForm.menuId}
              onChange={(e) => setComboForm({ ...comboForm, menuId: e.target.value })}
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
              Combo Name *
            </label>
            <input
              type="text"
              value={comboForm.name}
              onChange={(e) => setComboForm({ ...comboForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Family Feast, Lunch Special"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={comboForm.description}
              onChange={(e) => setComboForm({ ...comboForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Describe the combo..."
            />
          </div>

          {/* Dish Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Dishes * (at least 1 required)
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
              {dishes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {comboForm.menuId ? 'No available dishes in this menu' : 'Please select a menu first'}
                </p>
              ) : (
                dishes.map((dish) => (
                  <div
                    key={dish.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border-2 transition-colors ${
                      selectedDishes.includes(dish.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDishes.includes(dish.id)}
                      onChange={() => handleDishToggle(dish.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    {dish.image ? (
                      <img
                        src={dish.image}
                        alt={dish.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-500">{dish.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{dish.name}</div>
                      <div className="text-xs text-gray-500">₹{dish.price.toFixed(2)}</div>
                    </div>
                    {selectedDishes.includes(dish.id) && (
                      <input
                        type="number"
                        min="1"
                        value={dishQuantities[dish.id] || 1}
                        onChange={(e) => handleQuantityChange(dish.id, e.target.value)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Price Calculation */}
          {selectedDishes.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Original Price:</span>
                <span className="font-medium">₹{calculateOriginalPrice().toFixed(2)}</span>
              </div>
              {comboForm.price && parseFloat(comboForm.price) > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Combo Price:</span>
                    <span className="font-medium text-green-600">₹{parseFloat(comboForm.price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-gray-600">Savings:</span>
                    <span className="font-bold text-green-600">
                      ₹{calculateSavings().toFixed(2)} 
                      ({((calculateSavings() / calculateOriginalPrice()) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Combo Price (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={comboForm.price}
              onChange={(e) => setComboForm({ ...comboForm, price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Combo Image
            </label>
            <div className="space-y-2">
              {comboForm.image && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-300">
                  <img
                    src={comboForm.image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setComboForm({ ...comboForm, image: '' })}
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
                  id="combo-image-upload"
                  disabled={uploadingImage}
                />
                <label
                  htmlFor="combo-image-upload"
                  className={`flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg cursor-pointer hover:bg-blue-700 transition-colors ${
                    uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploadingImage ? 'Uploading & Optimizing...' : comboForm.image ? 'Change Image' : 'Upload Image'}
                </label>
                {comboForm.image && (
                  <button
                    type="button"
                    onClick={() => setComboForm({ ...comboForm, image: '' })}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Upload an image (Max 10MB). Images will be automatically optimized.
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="comboIsActive"
              checked={comboForm.isActive}
              onChange={(e) => setComboForm({ ...comboForm, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="comboIsActive" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsComboModal(false);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={uploadingImage || selectedDishes.length === 0}
            >
              {editingCombo ? 'Update Combo' : 'Create Combo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModal}
        onClose={() => {
          setIsDeleteModal(false);
          setDeletingCombo(null);
        }}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete the combo "{deletingCombo?.name}"? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => {
                setIsDeleteModal(false);
                setDeletingCombo(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteCombo}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete Combo
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}