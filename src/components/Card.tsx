
import { ReactNode } from 'react'

export default function Card({ title, right, children }: { title?: string, right?: ReactNode, children: ReactNode }) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        {title && <h3 className="font-semibold">{title}</h3>}
        {right}
      </div>
      {children}
    </section>
  )
}
