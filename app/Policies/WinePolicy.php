<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Wine;

class WinePolicy
{
    public function view(User $user, Wine $wine): bool
    {
        return $user->belongsToHousehold($wine->household_id);
    }

    public function update(User $user, Wine $wine): bool
    {
        return $this->view($user, $wine);
    }

    public function delete(User $user, Wine $wine): bool
    {
        return $this->view($user, $wine);
    }
}
