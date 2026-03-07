'use client'

import { Upload, X } from 'lucide-react'
import { useCallback, useState } from 'react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number
  className?: string
}

export default function FileUpload({
  onFileSelect,
  accept = '.csv',
  maxSize = 10 * 1024 * 1024, // 10MB
  className = '',
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${(maxSize / 1024 / 1024).toFixed(1)}MB limit`
    }
    if (accept && !file.name.match(new RegExp(accept.replace('*', '.*')))) {
      return `File type must be ${accept}`
    }
    return null
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      setError('')

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0]
        const validationError = validateFile(file)
        
        if (validationError) {
          setError(validationError)
          return
        }
        
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [maxSize, accept, onFileSelect]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    setError('')
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const validationError = validateFile(file)
      
      if (validationError) {
        setError(validationError)
        return
      }
      
      setSelectedFile(file)
      onFileSelect(file)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setError('')
  }

  return (
    <div className={className}>
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : error
            ? 'border-red-500 bg-red-50'
            : selectedFile
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {selectedFile ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                clearFile()
              }}
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold text-primary-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              CSV files up to {(maxSize / 1024 / 1024).toFixed(0)}MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
