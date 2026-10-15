<?php

namespace App\Policies;

use App\Models\Cellar;
use App\Models\User;

class CellarPolicy
{
    public function view(User $user, Cellar $cellar): bool
    {
        return $user->belongsToHousehold($cellar->household_id);
    }

    public function update(User $user, Cellar $cellar): bool
    {
        return $this->view($user, $cellar);
    }

    public function delete(User $user, Cellar $cellar): bool
    {
        return $this->view($user, $cellar);
    }
}
