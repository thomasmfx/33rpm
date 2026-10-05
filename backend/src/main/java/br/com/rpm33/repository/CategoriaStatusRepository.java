package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.CategoriaStatus;

public interface CategoriaStatusRepository extends JpaRepository<CategoriaStatus, Long> {

  Optional<CategoriaStatus> findByDescIgnoreCaseAndTipo(String desc, String tipo);
}
