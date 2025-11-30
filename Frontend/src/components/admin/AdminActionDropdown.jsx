import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';

/**
 * AdminActionDropdown - Component dropdown menu cho các actions
 * @param {array} actions - Mảng các action config: [{ label, icon, onClick, className, variant }]
 * @param {React.ReactNode} trigger - Custom trigger button (optional)
 * @param {string} align - Alignment của dropdown ('start' | 'end', default: 'end')
 */
const AdminActionDropdown = ({ 
  actions = [],
  trigger,
  align = 'end'
}) => {
  if (actions.length === 0) return null;

  // Icon mapping
  const iconMap = {
    view: Eye,
    edit: Edit,
    delete: Trash2,
    default: MoreVertical
  };

  const defaultTrigger = (
    <Button size="sm" variant="ghost" className="action-btn">
      <MoreVertical className="w-4 h-4 text-black" />
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {actions.map((action, index) => {
          const IconComponent = action.icon 
            ? (typeof action.icon === 'string' ? iconMap[action.icon] || iconMap.default : action.icon)
            : null;

          return (
            <DropdownMenuItem 
              key={action.key || index}
              onClick={action.onClick}
              className={action.className || ''}
            >
              {IconComponent && <IconComponent className="w-4 h-4 mr-2" />}
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AdminActionDropdown;

