'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { toast } from 'react-hot-toast';

export default function RestaurantDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.id;

  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isEditRestaurantModal, setIsEditRestaurantModal] = useState(false);
  const [isMenuModal, setIsMenuModal] = useState(false);
  const [isDeleteModal, setIsDeleteModal] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form states
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    logo: '',
    isActive: true
  });

  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    isActive: true,
    config: {}
  });

  // Fetch restaurant and menus
  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantDetails();
    }
  }, [restaurantId]);

  const fetchRestaurantDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [restaurantResponse, menusResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/restaurants/${restaurantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/restaurants/${restaurantId}/menus`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);



      if (!restaurantResponse.ok) throw new Error('Failed to fetch restaurant');
      if (!menusResponse.ok) throw new Error('Failed to fetch menus');

      const restaurantData = await restaurantResponse.json();
      
      const menusData = await menusResponse.json();

      console.log(restaurantData.restaurant)
      console.log(menusData)
      
      setRestaurant(restaurantData.restaurant);
      setRestaurantForm(restaurantData.restaurant);
      setMenus(menusData);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch restaurant details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Restaurant CRUD
  const handleUpdateRestaurant = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/restaurants/${restaurantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(restaurantForm),
      });

      if (!response.ok) throw new Error('Failed to update restaurant');

      const data = await response.json();
      
      setRestaurant(data.restaurant);
      setIsEditRestaurantModal(false);
      toast.success('Restaurant updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update restaurant');
      console.error(error);
    }
  };

  const handleDeleteRestaurant = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/restaurants/${restaurantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete restaurant');
      
      toast.success('Restaurant deleted successfully');
      router.push('/restaurants');
    } catch (error) {
      toast.error(error.message || 'Failed to delete restaurant');
      console.error(error);
    }
  };

  // Menu CRUD
  const handleCreateMenu = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...menuForm,
          restaurantId
        }),
      });

      if (!response.ok) throw new Error('Failed to create menu');

      const data = await response.json();
      
      setMenus([...menus, data]);
      setIsMenuModal(false);
      resetMenuForm();
      toast.success('Menu created successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to create menu');
      console.error(error);
    }
  };

  const handleUpdateMenu = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menus/${selectedMenu.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(menuForm),
      });

      if (!response.ok) throw new Error('Failed to update menu');

      const data = await response.json();
      
      setMenus(menus.map(m => m.id === selectedMenu.id ? data : m));
      setIsMenuModal(false);
      resetMenuForm();
      toast.success('Menu updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update menu');
      console.error(error);
    }
  };

  const handleDeleteMenu = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menus/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete menu');
      
      setMenus(menus.filter(m => m.id !== deleteTarget.id));
      setIsDeleteModal(false);
      setDeleteTarget(null);
      toast.success('Menu deleted successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to delete menu');
      console.error(error);
    }
  };

  const handleGenerateQRCode = async (menuId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menus/${menuId}/generate-qr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to generate QR code');

      const data = await response.json();
      
      setMenus(menus.map(m => m.id === menuId ? data : m));
      toast.success('QR Code generated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to generate QR code');
      console.error(error);
    }
  };

  // Helper functions
  const openEditRestaurantModal = () => {
    setRestaurantForm(restaurant);
    setIsEditRestaurantModal(true);
  };

  const openCreateMenuModal = () => {
    resetMenuForm();
    setSelectedMenu(null);
    setIsMenuModal(true);
  };

  const openEditMenuModal = (menu) => {
    setSelectedMenu(menu);
    setMenuForm({
      name: menu.name,
      description: menu.description || '',
      isActive: menu.isActive,
      config: menu.config || {}
    });
    setIsMenuModal(true);
  };

  const openDeleteModal = (target, type) => {
    setDeleteTarget({ ...target, type });
    setIsDeleteModal(true);
  };

  const resetMenuForm = () => {
    setMenuForm({
      name: '',
      description: '',
      isActive: true,
      config: {}
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Restaurant not found</h2>
          <button
            onClick={() => router.push('/restaurants')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/restaurants')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
        >
          ← Back to Restaurants
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Restaurant Details</h1>
      </div>

      {/* Restaurant Info Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            {restaurant.logo ? (
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-blue-100 flex items-center justify-center">
                {/* <span className="text-blue-600 font-semibold text-2xl">{restaurant.name.charAt(0)}</span> */}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{restaurant.name}</h2>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                  restaurant.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {restaurant.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openEditRestaurantModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit Restaurant
            </button>
            <button
              onClick={() => openDeleteModal(restaurant, 'restaurant')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete Restaurant
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-sm text-gray-600">Description</p>
            <p className="text-gray-800">{restaurant.description || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Address</p>
            <p className="text-gray-800">{restaurant.address || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="text-gray-800">{restaurant.phone || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-gray-800">{restaurant.email || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Menus Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Menus</h3>
          <button
            onClick={openCreateMenuModal}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Add Menu
          </button>
        </div>

        {menus.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No menus found</p>
            <button
              onClick={openCreateMenuModal}
              className="text-blue-600 hover:text-blue-700"
            >
              Create your first menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menus.map((menu) => (
              <div
                key={menu.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg font-semibold text-gray-800">{menu.name}</h4>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      menu.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {menu.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {menu.description || 'No description'}
                </p>

                {menu.qrCode && (
                  <div className="mb-4">
                    <img
                      src={menu.qrCode}
                      alt="QR Code"
                      className="w-32 h-32 mx-auto border border-gray-200 rounded"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {!menu.qrCode && (
                    <button
                      onClick={() => handleGenerateQRCode(menu.id)}
                      className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                    >
                      Generate QR Code
                    </button>
                  )}
                  <button
                    onClick={() => openEditMenuModal(menu)}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Edit Menu
                  </button>
                  <button
                    onClick={() => openDeleteModal(menu, 'menu')}
                    className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete Menu
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Restaurant Modal */}
      <Modal
        isOpen={isEditRestaurantModal}
        onClose={() => setIsEditRestaurantModal(false)}
        title="Edit Restaurant"
      >
        <form onSubmit={handleUpdateRestaurant} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Restaurant Name *
            </label>
            <input
              type="text"
              value={restaurantForm.name}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={restaurantForm.description}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={restaurantForm.address}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={restaurantForm.phone}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={restaurantForm.email}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo URL
            </label>
            <input
              type="url"
              value={restaurantForm.logo}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, logo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={restaurantForm.isActive}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsEditRestaurantModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Update Restaurant
            </button>
          </div>
        </form>
      </Modal>

      {/* Menu Modal (Create/Edit) */}
      <Modal
        isOpen={isMenuModal}
        onClose={() => {
          setIsMenuModal(false);
          resetMenuForm();
        }}
        title={selectedMenu ? 'Edit Menu' : 'Create Menu'}
      >
        <form onSubmit={selectedMenu ? handleUpdateMenu : handleCreateMenu} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Menu Name *
            </label>
            <input
              type="text"
              value={menuForm.name}
              onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={menuForm.description}
              onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="menuIsActive"
              checked={menuForm.isActive}
              onChange={(e) => setMenuForm({ ...menuForm, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="menuIsActive" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsMenuModal(false);
                resetMenuForm();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {selectedMenu ? 'Update Menu' : 'Create Menu'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModal}
        onClose={() => {
          setIsDeleteModal(false);
          setDeleteTarget(null);
        }}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this {deleteTarget?.type}? This action cannot be undone.
          </p>
          
          {deleteTarget?.type === 'restaurant' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                Warning: Deleting this restaurant will also delete all associated menus, categories, dishes, and combos.
              </p>
            </div>
          )}

          {deleteTarget?.type === 'menu' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                Warning: Deleting this menu will also delete all associated categories, dishes, and combos.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => {
                setIsDeleteModal(false);
                setDeleteTarget(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={deleteTarget?.type === 'restaurant' ? handleDeleteRestaurant : handleDeleteMenu}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete {deleteTarget?.type}   
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}