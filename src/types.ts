type Table<Row extends Record<string, unknown>> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

type SchoolRow = {
  id: string; name: string; code: string; logo_url: string | null
  status: 'active' | 'inactive' | 'suspended'; created_at: string; updated_at: string
}
type BranchRow = {
  id: string; school_id: string; name: string; code: string
  address_line1: string | null; address_line2: string | null; city: string | null; state: string | null
  postal_code: string | null; phone: string | null; email: string | null
  status: 'active' | 'inactive' | 'suspended'; created_at: string; updated_at: string
}
type ProfileRow = {
  id: string; full_name: string | null
  role: 'admin' | 'school_manager' | 'branch_manager' | 'customer'
  school_id: string | null; branch_id: string | null; login_id: string | null; phone: string | null
  status: 'active' | 'inactive' | 'suspended'; created_at: string; updated_at: string
}
type StudentRow = {
  id: string; school_id: string; branch_id: string; user_id: string | null
  student_code: string; full_name: string; class_name: string | null; section: string | null
  gender: 'boys' | 'girls' | 'unisex' | null; date_of_birth: string | null
  status: 'active' | 'inactive' | 'suspended'; created_at: string; updated_at: string
}
type ProductRow = {
  id: string; category_id: string | null; name: string; slug: string; description: string | null
  gender: 'boys' | 'girls' | 'unisex'; image_url: string | null; base_price: number
  status: 'active' | 'inactive' | 'suspended'; created_at: string; updated_at: string
}
type ProductVariantRow = {
  id: string; product_id: string; sku: string; size_label: string | null; color: string | null
  variant_name: string | null; price: number | null; status: 'active' | 'inactive' | 'suspended'
  created_at: string; updated_at: string
}
type UniformPackageRow = {
  id: string; name: string; slug: string; description: string | null
  gender: 'boys' | 'girls' | 'unisex'; image_url: string | null; base_price: number
  status: 'active' | 'inactive' | 'suspended'; created_at: string; updated_at: string
}
type PackageItemRow = {
  id: string; package_id: string; product_id: string; quantity: number; is_required: boolean
  requires_size: boolean; selection_group: string | null; sort_order: number; created_at: string
}

export type Database = {
  public: {
    Tables: {
      schools: Table<SchoolRow>
      branches: Table<BranchRow>
      profiles: Table<ProfileRow>
      students: Table<StudentRow>
      products: Table<ProductRow>
      product_variants: Table<ProductVariantRow>
      uniform_packages: Table<UniformPackageRow>
      package_items: Table<PackageItemRow>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      account_role: 'admin' | 'school_manager' | 'branch_manager' | 'customer'
      record_status: 'active' | 'inactive' | 'suspended'
      gender_type: 'boys' | 'girls' | 'unisex'
    }
    CompositeTypes: Record<string, never>
  }
}

export type School = Database['public']['Tables']['schools']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Student = Database['public']['Tables']['students']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductVariant = Database['public']['Tables']['product_variants']['Row']
export type UniformPackage = Database['public']['Tables']['uniform_packages']['Row']
export type PackageItem = Database['public']['Tables']['package_items']['Row']
export type PortalMode = 'login' | 'store' | 'admin'
