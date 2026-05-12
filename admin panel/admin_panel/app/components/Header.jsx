'use client'

export default function Header({ title }) {
  return (
    <div className="bg-white border-b px-8 py-4">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
    </div>
  );
}

