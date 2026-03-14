'use client'

export default function Greeting({ name }: { name: string }) {
  const hour = new Date().getHours()
  const time = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const emoji = hour < 17 ? '☀️' : '🌙'

  return (
    <h1 className="text-2xl font-bold text-gray-900">
      Good {time}, {name} {emoji}
    </h1>
  )
}
