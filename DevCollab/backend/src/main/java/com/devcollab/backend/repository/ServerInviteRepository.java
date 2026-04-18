package com.devcollab.backend.repository;

import com.devcollab.backend.entity.ServerInvite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ServerInviteRepository extends JpaRepository<ServerInvite, Long> {
    Optional<ServerInvite> findByCode(String code);
}
