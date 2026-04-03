package com.devcollab.backend.repository;

import com.devcollab.backend.entity.Reaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReactionRepository extends JpaRepository<Reaction, Long> {
    List<Reaction> findByMessageId(Long messageId);
}
