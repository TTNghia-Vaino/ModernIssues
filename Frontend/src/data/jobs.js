export const jobs = [
  {
    id: 'j1',
    title: 'Nhân viên kỹ thuật',
    department: 'Technician - Services',
    location: '4C Đồng Xoài',
    fullLocation: 'Hồ Chí Minh VN-SG 700000',
    openings: 2,
    postedDate: '24/10/2025 09:51:37',
    description: 'Chịu trách nhiệm bảo trì, sửa chữa và hỗ trợ kỹ thuật cho khách hàng.',
    requirements: [
      'Am hiểu về phần cứng máy tính',
      'Có khả năng giao tiếp tốt',
      'Nhiệt huyệt và trách nhiệm'
    ]
  },
  {
    id: 'j2',
    title: 'Nhân viên bán hàng showroom',
    department: 'Showroom 4C Đồng Xoài',
    location: '4C Đồng Xoài',
    fullLocation: 'Hồ Chí Minh VN-SG 700000',
    openings: 1,
    postedDate: '24/10/2025 09:50:15',
    description: 'Tư vấn và bán hàng trực tiếp tại showroom, chăm sóc khách hàng.',
    requirements: [
      'Kỹ năng giao tiếp và bán hàng tốt',
      'Am hiểu sản phẩm công nghệ',
      'Thái độ nhiệt tình, thân thiện'
    ]
  },
  {
    id: 'j3',
    title: 'Marketing Executive',
    department: 'Marketing',
    location: '4C Đồng Xoài',
    fullLocation: 'Hồ Chí Minh VN-SG 700000',
    openings: 2,
    postedDate: '23/10/2025 14:30:00',
    description: 'Phát triển và thực hiện các chiến dịch marketing online và offline.',
    requirements: [
      'Kinh nghiệm về marketing digital',
      'Sáng tạo và chủ động',
      'Biết sử dụng các công cụ marketing'
    ]
  },
  {
    id: 'j4',
    title: 'Nhân viên bán hàng showroom',
    department: 'Showroom 60 Dịch Vọng Hậu',
    location: '60 Dịch Vọng Hậu',
    fullLocation: 'Hà Nội VN-HN 100000',
    openings: 1,
    postedDate: '22/10/2025 10:20:00',
    description: 'Tư vấn và bán hàng trực tiếp tại showroom, chăm sóc khách hàng.',
    requirements: [
      'Kỹ năng giao tiếp và bán hàng tốt',
      'Am hiểu sản phẩm công nghệ',
      'Thái độ nhiệt tình, thân thiện'
    ]
  },
  {
    id: 'j5',
    title: 'Kỹ thuật viên sửa chữa',
    department: 'Technician - Services',
    location: '60 Dịch Vọng Hậu',
    fullLocation: 'Hà Nội VN-HN 100000',
    openings: 1,
    postedDate: '21/10/2025 16:45:00',
    description: 'Sửa chữa, bảo dưỡng các thiết bị công nghệ cho khách hàng.',
    requirements: [
      'Có kinh nghiệm sửa chữa máy tính, laptop',
      'Kỹ năng giải quyết vấn đề tốt',
      'Chịu khó, cẩn thận'
    ]
  }
];

export const departments = [
  'Tất cả phòng ban',
  'Showroom 4C Đồng Xoài',
  'Marketing',
  'Showroom 60 Dịch Vọng Hậu',
  'Technician - Services'
];

export const getJobsByDepartment = (department) => {
  if (department === 'Tất cả phòng ban' || !department) {
    return jobs;
  }
  return jobs.filter(job => job.department === department);
};

