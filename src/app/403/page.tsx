export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You don't have permission to access this page.
          </p>
          <div className="mt-8 p-4 bg-red-50 rounded-md">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  403 Forbidden
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Only authorized administrators can access this area.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <a
              href="/"
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Return to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
