package br.com.rpm33.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.MotivoStatus;

public interface MotivoStatusRepository extends JpaRepository<MotivoStatus, Long> {
}
