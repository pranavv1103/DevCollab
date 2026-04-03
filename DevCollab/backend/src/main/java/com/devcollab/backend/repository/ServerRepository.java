package com.devcollab.backend.repository;

import com.devcollab.backend.entity.Server;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ServerRepository extends JpaRepository<Server, Long> {
    Optional<Server> findByInviteCode(String inviteCode);
}
