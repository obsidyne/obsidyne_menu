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
  const [selectedMenu, setSelectedMenu] = useState('');
  
  // Modal states
  const [isCreateModal, setIsCreateModal] = useState(false);
  const [isEditModal, setIsEditModal] = useState(false);
  const [isDeleteModal, setIsDeleteModal] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(null);

  // Form state
  const [comboForm, setComboForm] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    menuId: '',
    isActive: true,
    selectedDishes: [] // Array of { dishId, quantity }
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
      fetchDishes(selectedMenu);
      fetchCombos();
    }
  }, [selectedMenu]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));

      // FIX: Use the correct endpoint that user has access to
      const menusResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/menus?restaurantId=${user.restaurantId}`,
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

  const fetchDishes = async (menuId) => {
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

  const fetchCombos = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/combos?menuId=${selectedMenu}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch combos');

      const data = await response.json();
      setCombos(data);
    } catch (error) {
      toast.error('Failed to load combos');
      console.error(error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

// src/app/(user)/combos/page.jsx
// Find and replace the uploadImage function (around line 133):

const uploadImage = async () => {
  if (!imageFile) return null;

  try {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/combos/upload`,
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
    // ✅ FIX: Return the full URL, not just the path
    return `${process.env.NEXT_PUBLIC_API_URL}${data.webpUrl}`;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

  const handleCreateCombo = async (e) => {
    e.preventDefault();
    try {
      setUploadProgress(10);

      // Upload image if selected
      let imageUrl = comboForm.image;
      if (imageFile) {
        setUploadProgress(30);
        imageUrl = await uploadImage();
        setUploadProgress(60);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/combos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: comboForm.name,
          description: comboForm.description,
          price: parseFloat(comboForm.price),
          image: imageUrl,
          menuId: selectedMenu,
          isActive: comboForm.isActive,
          dishes: comboForm.selectedDishes
        })
      });

      setUploadProgress(80);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create combo');
      }

      await fetchCombos();
      setIsCreateModal(false);
      resetForm();
      setUploadProgress(100);
      toast.success('Combo created successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    } finally {
      setUploadProgress(0);
    }
  };

  const handleUpdateCombo = async (e) => {
    e.preventDefault();
    try {
      setUploadProgress(10);

      // Upload new image if selected
      let imageUrl = comboForm.image;
      if (imageFile) {
        setUploadProgress(30);
        imageUrl = await uploadImage();
        setUploadProgress(60);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/combos/${selectedCombo.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: comboForm.name,
            description: comboForm.description,
            price: parseFloat(comboForm.price),
            image: imageUrl,
            isActive: comboForm.isActive,
            dishes: comboForm.selectedDishes
          })
        }
      );

      setUploadProgress(80);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update combo');
      }

      await fetchCombos();
      setIsEditModal(false);
      resetForm();
      setUploadProgress(100);
      toast.success('Combo updated successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    } finally {
      setUploadProgress(0);
    }
  };

  const handleDeleteCombo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/combos/${selectedCombo.id}`,
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

      await fetchCombos();
      setIsDeleteModal(false);
      setSelectedCombo(null);
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

      await fetchCombos();
      toast.success('Status updated successfully');
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleAddDish = () => {
    setComboForm({
      ...comboForm,
      selectedDishes: [...comboForm.selectedDishes, { dishId: '', quantity: 1 }]
    });
  };

  const handleRemoveDish = (index) => {
    setComboForm({
      ...comboForm,
      selectedDishes: comboForm.selectedDishes.filter((_, i) => i !== index)
    });
  };

  const handleDishChange = (index, field, value) => {
    const updatedDishes = [...comboForm.selectedDishes];
    updatedDishes[index][field] = value;
    setComboForm({ ...comboForm, selectedDishes: updatedDishes });
  };

  const openCreateModal = () => {
    resetForm();
    setSelectedCombo(null);
    setIsCreateModal(true);
  };

  const openEditModal = (combo) => {
    setSelectedCombo(combo);
    setComboForm({
      name: combo.name,
      description: combo.description || '',
      price: combo.price.toString(),
      image: combo.image || '',
      menuId: combo.menuId,
      isActive: combo.isActive,
      selectedDishes: combo.comboDishes?.map(cd => ({
        dishId: cd.dishId,
        quantity: cd.quantity
      })) || []
    });
    setImagePreview(combo.image || '');
    setImageFile(null);
    setIsEditModal(true);
  };

  const openDeleteModal = (combo) => {
    setSelectedCombo(combo);
    setIsDeleteModal(true);
  };

  const resetForm = () => {
    setComboForm({
      name: '',
      description: '',
      price: '',
      image: '',
      menuId: '',
      isActive: true,
      selectedDishes: []
    });
    setImageFile(null);
    setImagePreview('');
  };

  const calculateTotalPrice = () => {
    return comboForm.selectedDishes.reduce((total, item) => {
      const dish = dishes.find(d => d.id === item.dishId);
      return total + (dish ? dish.price * item.quantity : 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading combos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Combos</h1>
        <p className="text-gray-600">Manage your combo offers</p>
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
        </div>

        <button
          onClick={openCreateModal}
          disabled={!selectedMenu}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          Add Combo
        </button>
      </div>

      {/* Combos Grid */}
      {!selectedMenu ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">Please select a menu to view combos</p>
        </div>
      ) : combos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
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
          {combos.map((combo) => (
            <div key={combo.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              {/* Combo Image */}
              <div className="h-48 bg-gray-200 relative">
                {combo.image ? (
                  <img
                    // src={combo.image}
                    src={`${process.env.NEXT_PUBLIC_API_URL}/${combo.image}`}
                    alt={combo.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    combo.isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {combo.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Combo Info */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">{combo.name}</h3>
                  <span className="text-lg font-bold text-blue-600">₹{combo.price}</span>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {combo.description || 'No description'}
                </p>

                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Includes:</p>
                  <div className="space-y-1">
                    {combo.comboDishes?.slice(0, 3).map((cd, idx) => (
                      <div key={idx} className="text-xs text-gray-700">
                        {cd.quantity}x {cd.dish?.name || 'Unknown Dish'}
                      </div>
                    ))}
                    {combo.comboDishes?.length > 3 && (
                      <div className="text-xs text-blue-600">
                        +{combo.comboDishes.length - 3} more items
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(combo)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(combo.id)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      combo.isActive
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {combo.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openDeleteModal(combo)}
                    className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Combo Modal */}
      <Modal
        isOpen={isCreateModal}
        onClose={() => setIsCreateModal(false)}
        title="Add New Combo"
      >
        <form onSubmit={handleCreateCombo} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Combo Name *
            </label>
            <input
              type="text"
              value={comboForm.name}
              onChange={(e) => setComboForm({ ...comboForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Combo Price *
            </label>
            <input
              type="number"
              step="0.01"
              value={comboForm.price}
              onChange={(e) => setComboForm({ ...comboForm, price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {comboForm.selectedDishes.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Individual total: ₹{calculateTotalPrice().toFixed(2)}
                {parseFloat(comboForm.price) < calculateTotalPrice() && (
                  <span className="text-green-600 ml-2">
                    (Save ₹{(calculateTotalPrice() - parseFloat(comboForm.price || 0)).toFixed(2)})
                  </span>
                )}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Combo Image
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

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Dishes in Combo *
              </label>
              <button
                type="button"
                onClick={handleAddDish}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Dish
              </button>
            </div>
            
            {comboForm.selectedDishes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded">
                No dishes added yet
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {comboForm.selectedDishes.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <select
                      value={item.dishId}
                      onChange={(e) => handleDishChange(index, 'dishId', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    >
                      <option value="">Select Dish</option>
                      {dishes.map((dish) => (
                        <option key={dish.id} value={dish.id}>
                          {dish.name} (₹{dish.price})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleDishChange(index, 'quantity', parseInt(e.target.value))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Qty"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDish(index)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={comboForm.isActive}
              onChange={(e) => setComboForm({ ...comboForm, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
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
              Create Combo
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal - Same structure as Create */}
      <Modal
        isOpen={isEditModal}
        onClose={() => setIsEditModal(false)}
        title="Edit Combo"
      >
        <form onSubmit={handleUpdateCombo} className="space-y-4">
          {/* Same form fields as create modal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Combo Name *
            </label>
            <input
              type="text"
              value={comboForm.name}
              onChange={(e) => setComboForm({ ...comboForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Combo Price *
            </label>
            <input
              type="number"
              step="0.01"
              value={comboForm.price}
              onChange={(e) => setComboForm({ ...comboForm, price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {comboForm.selectedDishes.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Individual total: ₹{calculateTotalPrice().toFixed(2)}
                {parseFloat(comboForm.price) < calculateTotalPrice() && (
                  <span className="text-green-600 ml-2">
                    (Save ₹{(calculateTotalPrice() - parseFloat(comboForm.price || 0)).toFixed(2)})
                  </span>
                )}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Combo Image
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

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Dishes in Combo *
              </label>
              <button
                type="button"
                onClick={handleAddDish}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Dish
              </button>
            </div>
            
            {comboForm.selectedDishes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded">
                No dishes added yet
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {comboForm.selectedDishes.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <select
                      value={item.dishId}
                      onChange={(e) => handleDishChange(index, 'dishId', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    >
                      <option value="">Select Dish</option>
                      {dishes.map((dish) => (
                        <option key={dish.id} value={dish.id}>
                          {dish.name} (₹{dish.price})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleDishChange(index, 'quantity', parseInt(e.target.value))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Qty"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDish(index)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={comboForm.isActive}
              onChange={(e) => setComboForm({ ...comboForm, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
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
              Update Combo
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
            Are you sure you want to delete "{selectedCombo?.name}"? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setIsDeleteModal(false)}
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