import Card from '@/components/Card'
import TransactionForm from '@/components/TransactionForm'
import TransactionsTable from '@/components/TransactionsTable'

export default function Transactions() {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <Card>
        <TransactionForm />
      </Card>
      <TransactionsTable />
    </div>
  )
}
